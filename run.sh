#!/bin/bash

# ASCII Art and Welcome Message
echo "
    ╦╔═╔═╗  ╦  ╔═╗╔═╗╔╦╗  ╔╦╗╔═╗╔═╗╔╦╗
    ╠╩╗║ ║  ║  ║ ║╠═╣ ║    ║ ║╣ ╚═╗ ║ 
    ╩ ╩╚═╝  ╩═╝╚═╝╩ ╩ ╩    ╩ ╚═╝╚═╝ ╩ 
"
echo "Welcome to K6 Load Testing Suite"
echo "================================"

# Function to get site URLs from values.js
get_site_options() {
    grep -o '"https://[^"]*"' values.js | tr -d '"'
}

# Function to get numeric input with default value
get_numeric_input() {
    local prompt=$1
    local default=$2
    local input
    
    read -p "$prompt [$default]: " input
    echo ${input:-$default}
}

# Function to get duration input with default value
get_duration_input() {
    local prompt=$1
    local default=$2
    local input
    
    echo "$prompt (Format: number + s/m/h, e.g., 30s, 5m, 1h)"
    read -p "[$default]: " input
    echo ${input:-$default}
}

# Function to configure load test parameters
configure_load_test() {
    echo -e "\nConfigure Load Test Parameters:"
    echo "--------------------------------"
    START_VUS=$(get_numeric_input "Enter starting number of VUs" 50)
    TARGET_VUS=$(get_numeric_input "Enter target number of VUs" 500)
    RAMP_UP_TIME=$(get_duration_input "Enter ramp-up duration" "5m")
}

# Function to select website
select_website() {
    echo "Select website to test:"
    PS3="Select a number: "
    
    # Create options array with URLs
    IFS=$'\n' read -r -d '' -a options < <(get_site_options && printf '\0')
    options+=("Exit")
    
    select opt in "${options[@]}"
    do
        if [[ "$opt" == "Exit" ]]; then
            echo "Exiting..."
            exit 0
        elif [[ -n "$opt" ]]; then
            SELECTED_INDEX=$((REPLY-1))
            echo "Selected: $opt"
            return
        else
            echo "Invalid option. Please try again."
        fi
    done
}

# Function to select test type
select_test_type() {
    echo -e "\nSelect test type:"
    PS3="Select a number: "
    select type in "Load Test" "Response Time Test" "Exit"; do
        case $REPLY in
            1)
                echo "Running Load Test..."
                configure_load_test
                K6_SELECTED_INDEX=$SELECTED_INDEX \
                K6_START_VUS=$START_VUS \
                K6_TARGET_VUS=$TARGET_VUS \
                K6_RAMP_UP_TIME=$RAMP_UP_TIME \
                k6 run scripts/load-test.js
                return
                ;;
            2)
                echo "Running Response Time Test..."
                K6_SELECTED_INDEX=$SELECTED_INDEX k6 run scripts/response-time-test.js
                return
                ;;
            3)
                echo "Exiting..."
                exit 0
                ;;
            *)
                echo "Invalid option. Please try again."
                ;;
        esac
    done
}

# Main execution
select_website
select_test_type
