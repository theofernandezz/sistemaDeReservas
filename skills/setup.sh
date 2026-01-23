#!/bin/bash

# =============================================================================
# AI Skills Setup Script
# Configures skills for multiple AI coding assistants
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Selection flags
CLAUDE=false
CODEX=false
GITHUB=false
GEMINI=false
CURSOR=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --claude)
            CLAUDE=true
            shift
            ;;
        --codex)
            CODEX=true
            shift
            ;;
        --github)
            GITHUB=true
            shift
            ;;
        --gemini)
            GEMINI=true
            shift
            ;;
        --cursor)
            CURSOR=true
            shift
            ;;
        --all)
            CLAUDE=true
            CODEX=true
            GITHUB=true
            GEMINI=true
            CURSOR=true
            shift
            ;;
        --help)
            echo "Usage: ./setup.sh [options]"
            echo ""
            echo "Options:"
            echo "  --claude    Configure for Claude/Anthropic"
            echo "  --codex     Configure for OpenAI Codex"
            echo "  --github    Configure for GitHub Copilot"
            echo "  --gemini    Configure for Google Gemini"
            echo "  --cursor    Configure for Cursor IDE"
            echo "  --all       Configure for all assistants"
            echo "  --help      Show this help message"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# =============================================================================
# Count skills
# =============================================================================

count_skills() {
    find "$SCRIPT_DIR" -name "SKILL.md" -type f | wc -l | tr -d ' '
}

SKILL_COUNT=$(count_skills)

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}           ${CYAN}AI Skills Setup for ai-library${NC}                ${BLUE}║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Found ${GREEN}$SKILL_COUNT${NC} skills in ./skills/"
echo ""

# =============================================================================
# Interactive mode if no flags provided
# =============================================================================

if ! $CLAUDE && ! $CODEX && ! $GITHUB && ! $GEMINI && ! $CURSOR; then
    echo -e "${YELLOW}No assistant specified. Running in interactive mode...${NC}"
    echo ""
    echo "Select AI assistants to configure (space to toggle, enter to confirm):"
    echo ""
    
    PS3="Enter your choice (1-6): "
    options=("Claude" "Codex" "GitHub Copilot" "Gemini" "Cursor" "All" "Done")
    
    selected=()
    
    while true; do
        select opt in "${options[@]}"; do
            case $opt in
                "Claude") CLAUDE=true; echo -e "${GREEN}✓ Claude selected${NC}" ;;
                "Codex") CODEX=true; echo -e "${GREEN}✓ Codex selected${NC}" ;;
                "GitHub Copilot") GITHUB=true; echo -e "${GREEN}✓ GitHub Copilot selected${NC}" ;;
                "Gemini") GEMINI=true; echo -e "${GREEN}✓ Gemini selected${NC}" ;;
                "Cursor") CURSOR=true; echo -e "${GREEN}✓ Cursor selected${NC}" ;;
                "All") 
                    CLAUDE=true
                    CODEX=true
                    GITHUB=true
                    GEMINI=true
                    CURSOR=true
                    echo -e "${GREEN}✓ All selected${NC}"
                    ;;
                "Done") break 2 ;;
                *) echo -e "${RED}Invalid option${NC}" ;;
            esac
            break
        done
    done
fi

# Check if at least one selected
if ! $CLAUDE && ! $CODEX && ! $GITHUB && ! $GEMINI && ! $CURSOR; then
    echo -e "${RED}No assistants selected. Exiting.${NC}"
    exit 1
fi

# =============================================================================
# Setup functions
# =============================================================================

setup_claude() {
    echo -e "${CYAN}Setting up Claude...${NC}"
    mkdir -p .claude
    
    # Create symlink to skills
    if [ ! -L ".claude/skills" ]; then
        ln -sf ../skills .claude/skills
    fi
    
    # Create CLAUDE.md if not exists
    if [ ! -f ".claude/CLAUDE.md" ]; then
        cat > .claude/CLAUDE.md << 'EOF'
# Claude Configuration

For AI skill guidelines, see [AGENTS.md](../AGENTS.md).

## Skills

All skills are available in `./skills/` directory.
Run `./skills/skill-sync/assets/sync.sh` after modifying skills.
EOF
    fi
    
    echo -e "${GREEN}✓ Claude configured${NC}"
}

setup_codex() {
    echo -e "${CYAN}Setting up Codex...${NC}"
    mkdir -p .codex
    
    if [ ! -L ".codex/skills" ]; then
        ln -sf ../skills .codex/skills
    fi
    
    echo -e "${GREEN}✓ Codex configured${NC}"
}

setup_github() {
    echo -e "${CYAN}Setting up GitHub Copilot...${NC}"
    mkdir -p .github
    
    if [ ! -L ".github/skills" ]; then
        ln -sf ../skills .github/skills
    fi
    
    # Create copilot instructions if not exists
    if [ ! -f ".github/copilot-instructions.md" ]; then
        cat > .github/copilot-instructions.md << 'EOF'
# Copilot Instructions

For coding guidelines, see [AGENTS.md](../AGENTS.md).

## Key Rules

1. Always use TypeScript with strict types
2. Follow the patterns in ./skills/ directory
3. Use Server Components by default (Next.js)
4. Validate all inputs with Zod
EOF
    fi
    
    echo -e "${GREEN}✓ GitHub Copilot configured${NC}"
}

setup_gemini() {
    echo -e "${CYAN}Setting up Gemini...${NC}"
    mkdir -p .gemini
    
    if [ ! -L ".gemini/skills" ]; then
        ln -sf ../skills .gemini/skills
    fi
    
    # Note: Gemini requires experimental.skills in settings
    echo -e "${YELLOW}Note: Enable experimental.skills in Gemini settings${NC}"
    echo -e "${GREEN}✓ Gemini configured${NC}"
}

setup_cursor() {
    echo -e "${CYAN}Setting up Cursor...${NC}"
    mkdir -p .cursor
    
    if [ ! -L ".cursor/skills" ]; then
        ln -sf ../skills .cursor/skills
    fi
    
    # Create cursor rules if not exists
    if [ ! -f ".cursor/rules" ]; then
        cat > .cursor/rules << 'EOF'
For coding guidelines, see AGENTS.md in the root directory.
All skills are in ./skills/ - load relevant SKILL.md files for context.

Key patterns:
- TypeScript with strict types (no `any`)
- Server Components by default
- Zod for all validation
- RLS on all Supabase tables
EOF
    fi
    
    echo -e "${GREEN}✓ Cursor configured${NC}"
}

# =============================================================================
# Run selected setups
# =============================================================================

echo ""
echo -e "${BLUE}Configuring selected assistants...${NC}"
echo ""

$CLAUDE && setup_claude
$CODEX && setup_codex
$GITHUB && setup_github
$GEMINI && setup_gemini
$CURSOR && setup_cursor

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║${NC}                  ${CYAN}Setup Complete!${NC}                         ${GREEN}║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Skills are now linked for selected AI assistants."
echo -e "Restart your AI coding assistant to load the skills."
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "  1. Review AGENTS.md for routing rules"
echo -e "  2. Run ./skills/skill-sync/assets/sync.sh after modifying skills"
echo ""
