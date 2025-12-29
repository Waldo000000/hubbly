# Check Conflicts Command

## Description

Analyzes projectmanagement/\* files and CLAUDE.md for conflicting information that could confuse an LLM. Reviews technical specifications, product requirements, and setup instructions for inconsistencies.

## Usage

```
/check-conflicts
```

## Implementation

This command will:

1. **Read all project documentation files**:
   - `projectmanagement/*.md`
   - `CLAUDE.md`

2. **Analyze for conflicts**:
   - Technology stack inconsistencies
   - Conflicting feature requirements
   - Database schema mismatches
   - Authentication method conflicts
   - API endpoint conflicts
   - Environment variable conflicts

3. **Report findings**:
   - List any conflicts found
   - Provide specific file locations
   - Suggest resolutions where possible
   - Flag ambiguous requirements

## Example Output

```
✅ No conflicts detected in project documentation

OR

⚠️  Conflicts detected:
1. Technology Stack Conflict:
   - TECHNICAL_SPEC.md:15 specifies "React 18+"
   - package.json shows React 17.0.2

2. Database Schema Conflict:
   - PRODUCT_SPEC.md mentions "user profiles"
   - schema.prisma missing Profile model
```

The command helps ensure all project documentation is aligned and won't confuse LLMs working on the codebase.
