import os
import re
import subprocess
import sys
sys.path.append("..") # Adds higher directory to python modules path.

import tabToLilypond

tabFolderPath = os.path.join(os.path.realpath(os.path.dirname(__file__)), "../public/files/tabs/")
generatedTabPath = os.path.join(os.path.realpath(os.path.dirname(__file__)), "./out/generatedTab.png")


def songPartSub(match):
    g = match.group(1)
    if g == "pre-chorus" or g == "prechorus" or g == "pre- chorus" or g == "interlude" or g =="instrumental"  or g == "transition" or g.startswith("pre-chorus") or g == "link":
        return "interlude"
    if g == "outro" or g == "end" or g=="ending" or g.startswith("outro"):
        return "outro"
    if g == "intro" or g == "start" or g == "opening":
        return "intro"
    if g == "solo" or g == "guitar solo":
        return "solo"
    if g == "out-chorus" or g == "chorus":
        return "chorus"
    
    if g == "bridge":
        return "bridge"
    else:
        print("Error: Unrecognized song part: " + g)
    
    return g

# matches a chopro chord
ch = re.compile("\[(\S*?)\]")

# matches a line that contains only (tex)chords or whitespaces:
onlyChords = re.compile("^(?:\^{\S+}|\s|:?\|:?)+$")

# matches spaces between chords if there are twi chords following each other directly:
followingChords = re.compile("(\^{\S+})\s+(?=\^{\S+})")

def convertChords(line):
    chords = []
    ret = ""
    global ch
    global onlyChords
    global followingChords
    for m in ch.finditer(line):
            i = m.start()
            chords.append((i, m.group(1)))
    if chords == []:
        return line + '\n'
    lastIndex = -1 
    for (i, c) in chords[::-1]:
        if lastIndex == -1:
            nextText = line[(i + 2 + len(c)):]
            ret = '^{' + c + '}' + nextText + ret
        else:
            nextText = line[(i + 2 + len(c)): lastIndex]
            if ' ' in nextText:
                ret = '^{' + c + '}' + nextText + ret
            else:
                ret = '^*{' + c + '}' + nextText + ' ' + ret
        lastIndex = i

    ret = line[:lastIndex] + ret

    if onlyChords.match(ret):
        ret = ret.replace('^', '_')
    else:
        ret = re.sub(followingChords, "\\1 \\\quad ", ret)
    return ret + '\n'

tab_match_number = 0

def replace_tab(match, artist, songname):
    global tab_match_number

    def filename_compat(s):
        
        s = s.replace('.', '')
        strs = s.split(' ')
        for ss in strs:
            ss = ss.capitalize()
        return '-'.join(strs)

    filename = ""
    fn = tabToLilypond.pngFromAsciiTab(match.group(1))
    if fn is not None:    
        filename = filename_compat(artist) + '-' + filename_compat(songname) + str(tab_match_number).zfill(2) +  '.png'
        outFile = os.path.join(tabFolderPath, filename)
        if os.path.exists(outFile):
            os.remove(outFile)
        print("moving tab to " + filename)
        os.rename(generatedTabPath, outFile) 
    else:
        return "\n"
    tab_match_number += 1
    return "\\begin{tablature}\n\includegraphics[width=1.0\\linewidth ]{tabs/" + filename + "}\n\\end{tablature}\n"

def convert(s):
    rpl = [('{boc}', '\\begin{chorus}'), ('{eoc}', '\\end{chorus}'), ('{begin_of_verse}', '\\begin{verse}'), ('{end_of_verse}', '\\end{verse}')]
    for r in rpl:
        s = s.replace(r[0], r[1])
    
    s = re.sub("{c:\[/(.*?)\]}", lambda match: "\\end{" + songPartSub(match) + "}", s)  
    s = re.sub("{c:\[(.*?)\]}", lambda match: "\\begin{" + songPartSub(match) + "}", s)  

    s = re.sub("^#(.*)\n", "%\g<1>\n", s) 

    songname = re.search("{[t|title]: (.*)}", s).group(1)
    artist = re.search("{artist: (.*)}", s).group(1)
    capo = re.search("{capo: ([0-9]*)}", s).group(1)
    bpm = re.search("{bpm: ([0-9]*)}", s).group(1)
    global tab_match_number
    tab_match_number = 0
    s = re.sub("{bot}.*?\n+(.*?)\n{eot}", lambda match: replace_tab(match, artist, songname), s,flags=re.S)
    
    lines = s.split('\r\n')
    if len(lines) <= 1:
        lines = s.split('\n')

    tab = re.compile(r"(\|[a-z~0-9\-]+)+\|")
    song = []
    song.append(lines[0])
    # leave out first four lines because those contain meta data

    for line in lines[5:]:             
        song.append(convertChords(line))

    song = '\n'.join(song)
    custom_nobreak = re.compile(r"\/\/[ ]*\n")
    song = re.sub(custom_nobreak, "~ ", song)
    pre = """\\begin{song}{%
    title={""" + songname + """}, %Songtitel
	artist={""" + artist + """}, %Interpret
	 %Album
	year={}, %Jahr
	capo={""" + capo + """}, %falls das Lied original mit capo gespielt wird, hier eintragen. In arabischen Zahlen, obwohl es im Songbook zu römischer wird (capo{3} wird zu Capo III)
	tags={kinderfreundlich} % falls dieses Lied nicht für Kinderaugen (und -ohren) geeignet ist, bitte das Wort löschen, sodass tags={} da steht
    }%\n%\n% Diese Datei basiert auf einer ChordPro Datei, Aenderungen hier koennten ueberschrieben werden.\n% Die chopro Datei zu bearbeiten ist aber eh einfacher. Sie liegt im Verzeichnis /chopro/convertible\n%\n"""
    after = "\\end{song}"
    song = pre + song + '\n' + after
    return song




def main():
    for file in os.listdir("./convertible"):
        f = open('./convertible/' + file, 'r')
        print("converting", file)
        converted = convert(f.read())
        f.close()
        outFileName = file.replace('chopro', 'tex')
        if os.path.exists('../Songs/' + outFileName):
            with open('../Songs/' + outFileName, 'r') as outFileRead:
                if converted == outFileRead.read():
                    print("Skipping, no difference")
                    continue
                       
        fout = open('../Songs/' + outFileName, 'w+')                
        fout.write(converted)
        fout.close()
    os.chdir('..')
    os.system('.\\generateSongList.bat')

if __name__ == '__main__':
    main()