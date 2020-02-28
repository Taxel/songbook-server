#
# Scans the ../public/files/chopro directory and translates all files to tex files if they changed
#
import os
from os import path
from shutil import copyfile
from time import time
import subprocess
import colorama


from choprototex import convert

texFolderPath = path.join(path.realpath(path.dirname(__file__)), "../public/files/tex/")
choFolderPath = path.join(path.realpath(path.dirname(__file__)), "../public/files/chopro/")

# enable colored console output
colorama.init()
def print_red(*args):
    print(colorama.Fore.RED, *args, colorama.Style.RESET_ALL)
def print_green(*args):
    print(colorama.Fore.GREEN, *args, colorama.Style.RESET_ALL)
def print_dim(*args):
    print(colorama.Style.DIM, *args, colorama.Style.RESET_ALL)

# returns a tuple of the file name without extension and the extension
def removeFileExtension(filename):
    if '.' in filename:
        spl = filename.split('.')
        return ('.'.join(spl[:-1]), spl[-1])
    return (filename, None)


def compile(filename, ext):
    with open(path.join(choFolderPath, "{}.{}".format(filename, ext)), 'r', encoding="utf-8") as file:
        try:
            converted = convert(file.read())
        except:
            return False
    with open(path.join(texFolderPath, "{}.tex".format(filename)), 'w', encoding="utf-8") as outFile:
        outFile.write(converted)
    print_green(filename, "converted")
    return True


# calls compile if the .chopro file is newer than the .tex file
def compileIfNecessary(filename, ext):

    # check when the cho or one of the generating source files was changed
    choModTime = path.getmtime(path.join(choFolderPath, "{}.{}".format(filename, ext)))
    choModTime = max(path.getmtime('./tabToLilypond.py'), choModTime)
    choModTime = max(path.getmtime('./choprototex.py'), choModTime)
    
    try:
        texModTime = path.getmtime(path.join(texFolderPath, filename + '.tex'))
    except OSError:
        texModTime = 0
    if choModTime < texModTime:
        #print_dim(filename,"skipped")
        return True
    # tex file has been modified, compile it
    return compile(filename, ext)




def main():
    successCount = 0
    totalCount = 0
    failedFiles = []
    startTime = time()
    for root, dirs, files in os.walk(choFolderPath):
        for file in files:
            (filename, ext) = removeFileExtension(file)
            success = compileIfNecessary(filename, ext)
            if not success:
                failedFiles.append(file)
            else:
                successCount += 1
            totalCount += 1

    elapsedTime = int(time() - startTime)
    print_green("\n Successfully compiled {} out of {} tex files. Duration: {}m {}s".format(successCount, totalCount, elapsedTime // 60, elapsedTime % 60))
    if len(failedFiles)> 0:
        print_red("These files failed to compile: (Scroll up to see the error messages)")
        for f in failedFiles:
            print("\t" + f)


if __name__ == "__main__":
    main()