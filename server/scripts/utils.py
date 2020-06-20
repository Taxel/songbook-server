
import colorama
import os
import sys
from time import time
from os import path
import json
from concurrent.futures import ThreadPoolExecutor as Executor

# enable colored console output
colorama.init()
def print_red(*args):
    print(colorama.Fore.RED, *args, colorama.Style.RESET_ALL)
def print_green(*args):
    print(colorama.Fore.GREEN, *args, colorama.Style.RESET_ALL)
def print_dim(*args):
    print(colorama.Style.DIM, *args, colorama.Style.RESET_ALL)

    
# Disable stdout
def blockPrint():
    sys.stdout = open(os.devnull, 'w')

# Restore stdout
def enablePrint():
    sys.stdout = sys.__stdout__

# returns a tuple of the file name without extension and the extension
def removeFileExtension(filename):
    if '.' in filename:
        spl = filename.split('.')
        return ('.'.join(spl[:-1]), spl[-1])
    return (filename, None)

# whether the script has been called with --batch as first argument
def isBatchMode():
    return len(sys.argv) > 1 and sys.argv[1] == "--batch"

# prints a passed dict in json form to stdout
def printDictToStdout(d):
    asJson = json.dumps(d)
    print(asJson)


# executes a function on all files in folder.
# also tracks success and elapsed time
# workerFunc is expected to return 0 on fail, 1 on success and 2 if file was skipped
def workloopSingleThreaded(folderpath, workerFunc):
    batchMode = isBatchMode()
    if(batchMode):
        blockPrint()
    totalCount = 0
    failedFiles = []
    successfulFiles = []
    startTime = time()
    for root, dirs, files in os.walk(folderpath):
        for file in files:
            (filename, ext) = removeFileExtension(file)
            success = workerFunc(filename, ext)
            if success == 0:
                failedFiles.append(file)
            elif success == 1:
                successfulFiles.append(file)
            totalCount += 1

    elapsedTime = int(time() - startTime)
    print_green("\n Successfully compiled {} out of {} tex files. Duration: {}m {}s".format(len(successfulFiles), totalCount, elapsedTime // 60, elapsedTime % 60))
    if len(failedFiles)> 0:
        print_red("These files failed to compile: (Scroll up to see the error messages)")
        for f in failedFiles:
            print("\t" + f)

    if(batchMode):
        enablePrint()
        printDictToStdout({
        "totalFiles": totalCount,
        "failedFiles": failedFiles,
        "successfulFiles": successfulFiles,
        "elapsedSeconds": elapsedTime
    })

def workloop(folderpath, workerFunc):
    batchMode = isBatchMode()
    if(batchMode):
        blockPrint()

    def processSingleFile(file):
        (filename, ext) = removeFileExtension(file)
        return workerFunc(filename, ext)

    totalCount = 0
    failedFiles = []
    successfulFiles = []
    startTime = time()
    for root, dirs, files in os.walk(folderpath):
        with Executor(max_workers=16) as executor:
            successes = executor.map(processSingleFile, files)
            for i, success in enumerate(successes):   
                file = files[i]     
                if success == 0:
                    failedFiles.append(file)
                elif success == 1:
                    successfulFiles.append(file)
                totalCount += 1

    elapsedTime = int(time() - startTime)
    print_green("\n Successfully compiled {} out of {} tex files. Duration: {}m {}s".format(len(successfulFiles), totalCount, elapsedTime // 60, elapsedTime % 60))
    if len(failedFiles)> 0:
        print_red("These files failed to compile: (Scroll up to see the error messages)")
        for f in failedFiles:
            print("\t" + f)

    if(batchMode):
        enablePrint()
        printDictToStdout({
        "totalFiles": totalCount,
        "failedFiles": failedFiles,
        "successfulFiles": successfulFiles,
        "elapsedSeconds": elapsedTime
    })