#!/bin/bash
# Usage: ./run.sh <filename> [input_file]
if [ "$#" -lt 1 ]; then
    echo "Usage: $0 filename [input_file]"
    exit 1
fi

FILE="$1"
EXT="${FILE##*.}"

if [ "$EXT" == "cpp" ]; then
    g++ "$FILE" -o program && { 
        [ -f "$2" ] && ./program < "$2" > output.txt 2>&1 || ./program > output.txt 2>&1; 
    }
elif [ "$EXT" == "java" ]; then
    # Extract class name from file name without extension
    CLASS_NAME="${FILE%.*}"
    
    # Compile Java file
    if javac "$FILE"; then
        # Run Java program with appropriate class name
        [ -f "$2" ] && java "$CLASS_NAME" < "$2" > output.txt 2>&1 || java "$CLASS_NAME" > output.txt 2>&1
    else
        echo "Java compilation failed:" > output.txt
        javac "$FILE" 2>> output.txt
        exit 1
    fi
elif [ "$EXT" == "python" ] || [ "$EXT" == "py" ]; then
    [ -f "$2" ] && python3 "$FILE" < "$2" > output.txt 2>&1 || python3 "$FILE" > output.txt 2>&1;
elif [ "$EXT" == "js" ] || [ "$EXT" == "javascript" ]; then
    [ -f "$2" ] && node "$FILE" < "$2" > output.txt 2>&1 || node "$FILE" > output.txt 2>&1;
else
    echo "Unsupported file type: $EXT" > output.txt 2>&1
    exit 1
fi 