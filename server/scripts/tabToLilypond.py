from subprocess import Popen, STDOUT, PIPE
import re
import os

e= ["e'","f'", "fis'", "g'", "gis'"]
B= ['b', "c'", "cis'", "d'", "dis'"]
G= ['g', 'gis', 'a', 'bes', 'b']
D= ['d', 'dis', 'e', 'f', 'fis']
A= ['a,', 'bes,', 'b,', 'c', 'cis']
E= ['e,', 'f,', 'fis,', 'g,', 'gis,']

chromaticScale = ['c', 'cis', 'd', 'dis', 'e', 'f', 'fis', 'g', 'gis', 'a', 'bes', 'b']

def getScaleWithOctave(oct):
    app = ""
    if oct > 0:
        app = "'" * oct
    elif oct < 0:
        app = "," * -oct
    return list(map(lambda pitch: pitch + app, chromaticScale))



guitarPitches = getScaleWithOctave(-1)[4:]
guitarPitches += getScaleWithOctave(0)
guitarPitches += getScaleWithOctave(1)
guitarPitches += getScaleWithOctave(2)
guitarPitches += getScaleWithOctave(3)
guitarPitches += getScaleWithOctave(4)



stringOffsets = [0, 5, 10, 15, 19, 24]



def getPitches(nextLine, line, maskLast, debug = False):
    if line == ('|' * len(line)):
        return '\n\\bar "||"', '------'

    global stringOffsets
    global guitarPitches
    ret = []
    merged = ['-', '-', '-', '-', '-', '-']
    lowestFret = 100
    for i, char in enumerate(line):
        if char.isnumeric():
            if maskLast[i] == 'X':
                continue
            elif nextLine[i].isnumeric():
                merged[i] = 'X'
                pitchIdx = (int(char) * 10 + int(nextLine[i]))
            else:
                pitchIdx = int(char)
            lowestFret = min(lowestFret, pitchIdx)
            ret.append(guitarPitches[stringOffsets[i] + pitchIdx])
        elif char in ['p', 'h', '/', '\\']:
            merged[i] = 'p'
    if len(ret) is 0:
        return "", ''.join(merged)
    multiple = len(ret) > 1
    if debug:
        print(ret)
    ret = ' '.join(ret)
    if multiple:
        ret = '<' + ret + '>32'
    else:
        ret =  ret + '32'
    
    
    if 'p' in maskLast:
        return '(' + ret + ') ', ''.join(merged)    
    return ret + ' ', ''.join(merged)

def strToPNG(s, outputPath="./out/generatedTab", debug=False):
    lyStr = """\\version "2.18.2"
    \\paper {
    indent = 0\mm
    line-width = 1000\mm
    oddHeaderMarkup = ""
    evenHeaderMarkup = ""
    oddFooterMarkup = ""
    evenFooterMarkup = ""
    } 
    
   \\new TabStaff \\absolute {
     \\clef moderntab
     \\cadenzaOn \n"""
    lyStr += s + '\n}\n'
    FNULL = open(os.devnull, 'w')
    p = Popen(['lilypond', '-dbackend=eps', '-dresolution=600', '--png', '-o' + outputPath, '-'], shell = False, stdout = FNULL if not debug else None, stderr = STDOUT, stdin = PIPE)
    p.communicate(input = lyStr.encode())

def getLowestFret(tabLine):
    def minimumNotNull(n1, n2, containedNullBefore):
        n1 = int(n1)
        n2 = int(n2)
        if n1 == 0:
            return (n2, True)
        if n2 == 0:
            return (n1, True)
        return (min(n1, n2), containedNullBefore)

    curMin = 100
    containsNull = False

    s = tabLine.replace('~', '-').replace('+', '-').replace('(', '-').replace(')', '-').split('-')
    for char in s:
        if char != '':
            if char.isnumeric():
                curMin, containsNull = minimumNotNull(char, curMin, containsNull)
            else:
                curStr = []
                if 'h' in char:
                    curStr = char.split('h')
                elif 'p' in char:
                    curStr = char.split('p')
                elif '/' in char:
                    curStr = char.split('/')
                elif '\\' in char:
                    curStr = char.split('\\')
                elif '|' in char:
                    curStr = char.split('|')
                elif 'b' in char:
                    curStr = char.split('b')
                else:
                    print("Could not split string: " + char)
                    continue

                if curStr is not []:
                    for st in curStr:
                        if st.isnumeric():
                            curMin, containsNull = minimumNotNull(st, curMin, containsNull)
                        
                
    return (curMin, containsNull)

def pngFromAsciiTab(tab, debug = False):
    lines = list(map(lambda l:l.strip(), tab.split('\n')[::-1]))

    tab = re.compile(r"(\|[/a-zA-Z~0-9\-]+)+\|")

    tabLines = []
    
    currentTab = 0
    skippedLastLine = True

    for l in lines:
        isTabLine = re.search(tab, l) is not None
        if isTabLine:
            if len(tabLines) == currentTab:
                tabLines.append([])
            tabLines[currentTab].append(l)
            skippedLastLine = False
        else:
            print("Skipping line because it is not a tab line: ")
            print(l)
            if not skippedLastLine:
                currentTab += 1
                skippedLastLine = True
    lilyTab = ""
    # currentTab is an array of string lines
    for currentTab in tabLines[::-1]:

        if len(currentTab) is not 6:
            print("Tab does not consist of 6 lines. This is currently not supported:")
            print('\n'.join(currentTab))
            return
        
        

        shortestLine = min([len(s) for s in currentTab])
        lowestFret = 100
        containsNull = False
        for fret, hasNull in [getLowestFret(s) for s in currentTab]:
            containsNull |= hasNull
            lowestFret = min(lowestFret, fret)
        


        if debug:
            print("The shortest line length is ", shortestLine)
            print("The lowest fret is ", lowestFret)
            print("The tab contains empty strings ", containsNull)

        lilyTab += '\n\\set TabStaff.restrainOpenStrings = ##f' if containsNull else '\n\\set TabStaff.restrainOpenStrings = ##t'
        lilyTab += '\n\\set TabStaff.minimumFret = #' + str(lowestFret) + '\n'

        sLast = ""
        mergedLast = "------"
        for i in range(shortestLine + 1):
            s = ""
            if i < shortestLine:
                for j in range(6):
                    s += currentTab[j][i]

            pLast, mergedLast = getPitches(s, sLast, mergedLast, debug=debug)
            if debug:
                print(sLast + ' -> ' + pLast)

            sLast = s
            lilyTab += pLast
        lilyTab += ' \\break\n'
    if debug:
        print(lilyTab)
    strToPNG(lilyTab, debug=debug)
    return "generatedTab.png"

def main():
    
    tab = """e|-----0-------------------0-----0----------------0-------0-------------------3p0-------0---|
B|--3-----3--1-------1--------3-----3--1------1-----3--3----3--1-------1----1------1h3--1---|
G|--------------0h2--2--2----------------0h2----0-----------------0h2--2--2-----------------|
D|-------------------3-------------------------------------------------3--------------------|
A|--------------------------------------------0-----------------------------------------0---|
E|----------------------------3---------------------3--3---------------------------3--------|

e|-----0-------------------0-----0----------------0--------0-------------------3p0-------0--|
B|--3-----3--1-------1--------3-----3--1------1------3--3----3--1-------10---1------1h3--1--|
G|--------------0h2--2--2----------------0h2----0------------------0h2--11-2----------------|
D|-------------------3--------------------------------------------------12------------------|
A|--------------------------------------------0------------------------------------------0--|
E|--3-------------------------3----------------------3--3---------------------------3-------|"""
    pngFromAsciiTab(tab, debug=True)

    
    

if __name__ == '__main__':
    main()