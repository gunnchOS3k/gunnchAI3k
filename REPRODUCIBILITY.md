        # Reproducibility — gunnchAI3k

        ## Clone / setup / run

        ```bash
        git clone https://github.com/gunnchOS3k/{name}.git
cd gunnchAI3k
npm ci
npm test
# Expected: CI smoke pass; tests pass or documented skip
        ```

        ## Expected outputs

        - Required documentation files present (`python3 scripts/check_required_files.py`)
        - Tests pass **or** documented smoke-only path for docs-only repos
        - No claim of field deployment from synthetic outputs alone

        ## Tool versions

        | Tool | Version guidance |
        |------|------------------|
        | Python | 3.10+ where `requirements.txt` exists |
        | Node | 18+ LTS where `package.json` exists |
        | Make | GNU Make where `Makefile` exists |

        Record exact versions in PR / release notes when publishing.

        ## Fresh machine checklist

        - [ ] Clone repo
        - [ ] Create clean venv / `npm ci`
        - [ ] Run `scripts/check_required_files.py`
        - [ ] Run test command from README
        - [ ] Compare outputs to `results/` or CI logs
        - [ ] Log environment in `reproducibility/FRESH_MACHINE_LOG.md` (optional)

        ## Evidence discipline

        **Real today:** Tutor scaffolding, lecture materials, integration docs

        **Synthetic / demo-only:** Demo tutor sessions

        **Planned:** Offline/low-bandwidth tutor mode

        **Not claimed:** Replacement for credentialed instruction
