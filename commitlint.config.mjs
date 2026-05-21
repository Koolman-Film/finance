/** @type {import("@commitlint/types").UserConfig} */
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // Allow longer subject lines (the default 72 is tight for descriptive scopes).
    "subject-case": [0],
    "header-max-length": [2, "always", 100],
    "body-max-line-length": [2, "always", 200],
    "footer-max-line-length": [2, "always", 200],
    "scope-enum": [
      1,
      "always",
      [
        // Areas of the codebase — informational, warn-only so we can add new ones freely.
        "db",
        "auth",
        "ui",
        "entry",
        "admin",
        "lock",
        "files",
        "export",
        "scripts",
        "deploy",
        "tooling",
        "deps",
      ],
    ],
  },
};
