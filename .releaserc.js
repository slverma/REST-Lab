// .releaserc.js — semantic-release configuration
//
// Plugin execution order matters:
//   1. commit-analyzer    — reads commits, decides version bump (or no release)
//   2. release-notes-generator — builds changelog text in memory
//   3. changelog          — writes changelog text to CHANGELOG.md
//   4. npm (no publish)   — writes new version into package.json + package-lock.json
//   5. exec               — runs `vsce publish` to push to VS Code Marketplace
//   6. github             — creates the GitHub Release with the generated notes
//   7. git                — commits package.json + package-lock.json + CHANGELOG.md
//                           back to main with "[skip ci]" to prevent an infinite loop
//
// Why @semantic-release/git is last:
//   It must commit whatever the earlier plugins wrote (package.json, CHANGELOG.md).
//   If it ran earlier, those files wouldn't be updated yet.

/** @type {import('semantic-release').GlobalConfig} */
module.exports = {
  // Only release from main
  branches: ["main"],

  plugins: [
    // ── 1. Analyze commits ────────────────────────────────────────────────────
    // Uses the Conventional Commits spec to decide the release type.
    //
    // Version bump rules:
    //   feat:          → minor  (1.2.x → 1.3.0)
    //   fix:           → patch  (1.2.x → 1.2.x+1)
    //   perf:          → patch
    //   revert:        → patch
    //   feat!: or
    //   BREAKING CHANGE → major (1.x.x → 2.0.0)
    //   chore/docs/style/refactor/test/ci/build → NO release
    [
      "@semantic-release/commit-analyzer",
      {
        preset: "conventionalcommits",
        releaseRules: [
          { type: "feat",     release: "minor"  },
          { type: "fix",      release: "patch"  },
          { type: "perf",     release: "patch"  },
          { type: "revert",   release: "patch"  },
          { type: "docs",     release: false    },
          { type: "style",    release: false    },
          { type: "chore",    release: false    },
          { type: "refactor", release: false    },
          { type: "test",     release: false    },
          { type: "build",    release: false    },
          { type: "ci",       release: false    },
          // Breaking change in ANY type → major
          { breaking: true,   release: "major"  },
        ],
      },
    ],

    // ── 2. Generate release notes ─────────────────────────────────────────────
    // Produces the human-readable notes used by both @semantic-release/changelog
    // and the GitHub Release body.
    [
      "@semantic-release/release-notes-generator",
      {
        preset: "conventionalcommits",
        presetConfig: {
          // Only these types appear in the changelog. Others are silently dropped.
          types: [
            { type: "feat",   section: "Features"         },
            { type: "fix",    section: "Bug Fixes"         },
            { type: "perf",   section: "Performance"       },
            { type: "revert", section: "Reverts"           },
            // chore/docs/etc. listed with hidden:true so they
            // are excluded from the rendered changelog
            { type: "docs",     hidden: true },
            { type: "style",    hidden: true },
            { type: "chore",    hidden: true },
            { type: "refactor", hidden: true },
            { type: "test",     hidden: true },
            { type: "build",    hidden: true },
            { type: "ci",       hidden: true },
          ],
        },
      },
    ],

    // ── 3. Write CHANGELOG.md ─────────────────────────────────────────────────
    // Prepends the new release section to the top of CHANGELOG.md.
    // @semantic-release/git (step 7) will commit this file.
    [
      "@semantic-release/changelog",
      {
        changelogFile: "CHANGELOG.md",
      },
    ],

    // ── 4. Update package.json / package-lock.json ───────────────────────────
    // npmPublish: false — updates the version field in package.json and
    // package-lock.json but does NOT publish to the npm registry.
    // This is the standard way to sync package.json without an npm publish.
    [
      "@semantic-release/npm",
      {
        npmPublish: false,
      },
    ],

    // ── 5. Publish to VS Code Marketplace ────────────────────────────────────
    // Runs only when there is an actual release (commit-analyzer returned a
    // version bump). VSCE_PAT is injected from the GitHub Actions secret.
    [
      "@semantic-release/exec",
      {
        publishCmd:
          "npm install -g @vscode/vsce && vsce publish -p ${VSCE_PAT}",
      },
    ],

    // ── 6. Create GitHub Release ──────────────────────────────────────────────
    // Creates the release entry on GitHub with the notes from step 2.
    // Also comments on issues and PRs that are resolved by this release.
    "@semantic-release/github",

    // ── 7. Commit updated files back to main ─────────────────────────────────
    // Pushes a single commit with the bumped package.json, package-lock.json,
    // and CHANGELOG.md. The "[skip ci]" token stops GitHub Actions from
    // treating this commit as a new push and re-triggering the release workflow.
    //
    // For this to work, "GitHub Actions" must be added as a bypass actor
    // in your main branch protection rule (see README / docs).
    [
      "@semantic-release/git",
      {
        assets: ["package.json", "package-lock.json", "CHANGELOG.md"],
        message:
          "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}",
      },
    ],
  ],
};
