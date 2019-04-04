#!/bin/bash

#####
# This Script cleans up all merge commits by:
#   * Replacing all utf8 - Emoji Characters with their text variants
#####

#####
# Print out a help message.
#####
function printHelpMessage() {
  printf "Usage:\n"
  printf "format_commit_messages.bash <filename> <outfilename>\n\n"
  printf "Arguments:\n\tfilename: Name of the file that contains the commits"
  printf " with their corresponding messages.\n"
  printf "\toutfilename: Name of the file that should be written.\n"
}

# If this script gets called without an argument, exit.
if [[ $# -ne 2 ]]; then
  echo "Wrong arguments."
  printHelpMessage
  exit 1
fi

if [[ $1 == "help" ]]; then
  printHelpMessage
  exit 0
fi

# Get the name of the file that contains the commit messages.
commitMessageFile="$1"

# Get the name of the file that should be written
outfileName="$2"

# Declare an array to store the processed lines
declare -a outLines

# loop over all lines
while read line; do

  currentOutLine="$line"

  # If a line contains a merge commit mark, remove it.
  if [[ $line =~ (🔀)|(\:twisted\_rightwards\_arrows\:) ]]; then
    currentOutLine=${currentOutLine/\:twisted\_rightwards\_arrows\:\ }
    currentOutLine=${currentOutLine/🔀}
  fi

  # Replace any emojis with their text variant.
  # If the emoji is not conform to our emoji guide,, it will be ignored.
  # You can find the guide here:
  # https://github.com/process-engine/bpmn-studio/blob/develop/.github/PULL_REQUEST_TEMPLATE.md
  currentOutLine=${currentOutLine/🐛/":bug:"}
  currentOutLine=${currentOutLine/🔧/":wrench:"}
  currentOutLine=${currentOutLine/💄/":lipstick:"}
  currentOutLine=${currentOutLine/⬇️/":arrow_down:"}
  currentOutLine=${currentOutLine/⬆️/":arrow_up:"}
  currentOutLine=${currentOutLine/🎨/":art:"}
  currentOutLine=${currentOutLine/⚡️/":zap:"}
  currentOutLine=${currentOutLine/🎉/":tada:"}
  currentOutLine=${currentOutLine/🚨/":rotating_light:"}
  currentOutLine=${currentOutLine/📦/":package:"}
  currentOutLine=${currentOutLine/✨/":sparkles:"}
  currentOutLine=${currentOutLine/♻️/":recycle:"}
  currentOutLine=${currentOutLine/🔖/":bookmark:"}
  currentOutLine=${currentOutLine/🔥/":fire:"}
  currentOutLine=${currentOutLine/✅/":white_check_mark:"}
  currentOutLine=${currentOutLine/🚑/":ambulance:"}
  currentOutLine=${currentOutLine/📝/":memo:"}
  currentOutLine=${currentOutLine/🚀/":rocket:"}
  currentOutLine=${currentOutLine/🔒/":lock:"}
  currentOutLine=${currentOutLine/🍎/":apple:"}
  currentOutLine=${currentOutLine/🐧/":penguin:"}
  currentOutLine=${currentOutLine/🔒/":lock:"}
  currentOutLine=${currentOutLine/🏁/":checkered_flag:"}
  currentOutLine=${currentOutLine/💚/":green_heart:"}
  currentOutLine=${currentOutLine/📌/":pushpin:"}
  currentOutLine=${currentOutLine/👷‍/":construction_worker:"}
  currentOutLine=${currentOutLine/➖/":heavy_minus_sign:"}
  currentOutLine=${currentOutLine/🐳/":whale:"}
  currentOutLine=${currentOutLine/➕/":heavy_plus_sign:"}
  currentOutLine=${currentOutLine/🔧/":wrench:"}
  currentOutLine=${currentOutLine/✏️/":pencil2:"}
  currentOutLine=${currentOutLine/🚚/":truck:"}
  currentOutLine=${currentOutLine/⏪/":rewind:"}
  currentOutLine=${currentOutLine/👽/":alien:"}
  currentOutLine=${currentOutLine/📄/":page_facing_up:"}
  currentOutLine=${currentOutLine/♿️/":wheelchair:"}
  currentOutLine=${currentOutLine/💬/":speech_balloon:"}
  currentOutLine=${currentOutLine/🗃/":card_file_box:"}
  currentOutLine=${currentOutLine/🚸/":children_crossing:"}
  currentOutLine=${currentOutLine/🏗/":building_construction:"}
  currentOutLine=${currentOutLine/⚗️/":alembic:"}
  currentOutLine=${currentOutLine/🔍/":mag:"}

  outLines+=("$currentOutLine")

done <"$commitMessageFile"

# Write the ordered lines to a new file.
printf "%s\n" "${outLines[@]}" > $outfileName
