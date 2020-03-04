#
# Scans the ../public/files/chopro directory and translates all files to tex files if they changed
#
import os
from os import path
from shutil import copyfile
import subprocess
import traceback
# custom modules
import utils
from choprototex import convert

texFolderPath = path.join(path.realpath(path.dirname(__file__)), "../public/files/tex/")
choFolderPath = path.join(path.realpath(path.dirname(__file__)), "../public/files/chopro/")

def compile(filename, ext):
    with open(path.join(choFolderPath, "{}.{}".format(filename, ext)), 'r', encoding="utf-8") as file:
        try:
            converted = convert(file.read())
        except Exception as e:
            print(e)
            print(traceback.format_exc())
            return 0
    with open(path.join(texFolderPath, "{}.tex".format(filename)), 'w', encoding="utf-8") as outFile:
        outFile.write(converted)
    utils.print_green(filename, "converted")
    return 1


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
        utils.print_dim(filename,"skipped")
        return 2
    # tex file has been modified, compile it
    return compile(filename, ext)

if __name__ == "__main__":
    utils.workloop(choFolderPath, compileIfNecessary)