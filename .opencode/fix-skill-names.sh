#!/bin/bash

# Script to fix skill names in frontmatter for OpenCode compatibility
# OpenCode requires: name must match folder name (lowercase, with hyphens)

cd "$(dirname "$0")/.."

skills_dir=".opencode/skills"

for skill_dir in "$skills_dir"/*/; do
    skill_name=$(basename "$skill_dir")
    skill_file="$skill_dir/SKILL.md"
    
    if [ -f "$skill_file" ]; then
        echo "Fixing: $skill_name"
        
        # Use sed to replace the name line in frontmatter
        # Match "name: anything" and replace with "name: folder_name"
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS sed
            sed -i '' "s/^name: .*/name: $skill_name/" "$skill_file"
        else
            # Linux sed
            sed -i "s/^name: .*/name: $skill_name/" "$skill_file"
        fi
    fi
done

echo "Done! All skill names fixed."
