#
# This scans the ../public/files/tex folder and compiles a pdf for each of them, provided there is not already a pdf that is newer than the tex file
#

import os
from os import path
from shutil import copyfile
from time import time
import subprocess
# custom modules
import utils

texFolderPath = path.join(path.realpath(path.dirname(__file__)), "../public/files/tex/")
pdfFolderPath = path.join(path.realpath(path.dirname(__file__)), "../public/files/pdf/")
latexRootFile = path.join(path.realpath(path.dirname(__file__)), "./latex_template/root_singleSong.tex")

# prints the lines that should contain the compilation error
def printErrorLog(filename):
    logfile = path.join("./out/", filename + ".log")
    with open(logfile, 'r', encoding="utf-8") as f:
        lines = f.readlines()
        shouldPrint = False
        count = 0
        # the last 12 lines are the "here's how much memory you used..." lines. Take the 20 before that and look for the first one that starts with ! indicating the error message starts
        for l in lines[-32:-14]:
            if l.startswith("!"):
                shouldPrint = True
            if shouldPrint:
                print(l, end='')
                count += 1



# compiles a pdf from a single tex file
# returns 1 if compilation succeeded, 0 otherwise
def compile(filename):    
    arguments = ["lualatex", "--jobname={0}".format(filename), "--output-dir=out", "--interaction=nonstopmode", "--halt-on-error", "\\def\\filename{{{0}}} \\input{{./latex_template/root_singleSong.tex}}".format(filename)]
    FNULL = open(os.devnull, 'w')
    errFile = open('./out/compile.log', 'w')
    code = subprocess.call(arguments, shell=True, stdout=FNULL, stderr=errFile)
    if code is 0:
        # compilation successful
        copyfile("./out/{0}.pdf".format(filename), path.join(pdfFolderPath, filename + ".pdf"))
        utils.print_green(filename,"success")
        return 1
    else:
        utils.print_red(filename,"compilation failed!")
        printErrorLog(filename)
        return 0

# calls compile if the .tex file is newer than the .pdf file
# returns 0 if failed, 1 if compiled successfully and 2 if skipped
def compileIfNecessary(filename, extension):

    # check when the tex or the root file was last modified
    texModTime = path.getmtime(path.join(texFolderPath, filename + '.tex'))
    texModTime = max(path.getmtime('./latex_template/root_singleSong.tex'), texModTime)
    
    try:
        pdfModTime = path.getmtime(path.join(pdfFolderPath, filename + '.pdf'))
    except OSError:
        pdfModTime = 0
    if texModTime < pdfModTime:
        #print_dim(filename,"skipped")
        return 2
    # tex file has been modified, compile it
    return compile(filename)

if __name__ == "__main__":
    utils.workloop(texFolderPath, compileIfNecessary)