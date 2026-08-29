/**
 * The documentation site's table of contents.
 *
 * Every markdown file under docs/ must appear here — build.mjs fails if one
 * does not, so adding a doc forces adding it to the nav instead of quietly
 * shipping a page nobody can reach.
 */
export const SECTIONS = [
  {
    title: 'Overview',
    pages: [{ file: 'README.md', title: 'Robinhood App Boilerplate', blurb: 'What it is, in one page' }]
  },
  {
    title: 'Guides',
    pages: [
      { file: 'docs/getting-started.md', title: 'Getting started' },
      { file: 'docs/guides/weight-strategies.md', title: 'Weight strategies' },
      { file: 'docs/guides/deploying.md', title: 'Deploying' },
      { file: 'docs/guides/frontend.md', title: 'Front end' },
      { file: 'docs/guides/example-arcade-guild.md', title: 'Example: Arcade Guild' },
      { file: 'docs/guides/example-options-desk-guild.md', title: 'Example: Options Desk Guild' }
    ]
  },
  {
    title: 'Concepts',
    pages: [
      { file: 'docs/architecture.md', title: 'Architecture' },
      { file: 'docs/economics.md', title: 'Economics & trust' }
    ]
  },
  {
    title: 'Reference',
    pages: [
      { file: 'docs/reference/contracts.md', title: 'Contracts' },
      { file: 'docs/reference/cli.md', title: 'CLI & scripts' },
      { file: 'docs/reference/configuration.md', title: 'Configuration' },
      { file: 'docs/reference/testing.md', title: 'Testing' }
    ]
  },
  {
    title: 'Project',
    pages: [
      { file: 'CLAUDE.md', title: 'Agent guide' },
      { file: 'docs/maintainers.md', title: 'Maintainers' }
    ]
  }
];

/** docs/README.md is the index those sections replace, so it is not a page. */
export const NOT_A_PAGE = ['docs/README.md'];
