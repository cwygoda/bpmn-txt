export const siteConfig = {
  title: 'BPMN-TXT',
  description: 'Human-readable BPMN 2.0 in text DSL',
  github: 'https://github.com/cwygoda/bpmn-txt'
};

export interface NavItem {
  text: string;
  link: string;
}

export interface SidebarItem {
  text: string;
  link?: string;
  items?: SidebarItem[];
}

export const nav: NavItem[] = [
  { text: 'Guide', link: '/guide' },
  { text: 'Reference', link: '/reference/syntax' },
  { text: 'Examples', link: '/examples' },
  { text: 'Playground', link: '/playground' }
];

export const sidebar: Record<string, SidebarItem[]> = {
  '/guide': [
    {
      text: 'Introduction',
      items: [
        { text: 'What is BPMN-TXT?', link: '/guide' },
        { text: 'Getting Started', link: '/guide/getting-started' },
        { text: 'CLI Usage', link: '/guide/cli' }
      ]
    },
    {
      text: 'Concepts',
      items: [
        { text: 'Processes & Pools', link: '/guide/processes' },
        { text: 'Tasks & Events', link: '/guide/tasks-events' },
        { text: 'Gateways & Flows', link: '/guide/gateways-flows' },
        { text: 'Layout', link: '/guide/layout' }
      ]
    }
  ],
  '/reference': [
    {
      text: 'Reference',
      items: [
        { text: 'Syntax Overview', link: '/reference/syntax' },
        { text: 'Elements', link: '/reference/elements' },
        { text: 'BPMN Mapping', link: '/reference/bpmn-mapping' }
      ]
    }
  ],
  '/examples': [
    {
      text: 'Examples',
      items: [
        { text: 'Overview', link: '/examples' },
        { text: 'Simple Process', link: '/examples/simple-process' },
        { text: 'Approval Workflow', link: '/examples/approval-workflow' },
        { text: 'Order Fulfillment', link: '/examples/order-fulfillment' },
        { text: 'Error Handling', link: '/examples/error-handling' }
      ]
    }
  ]
};

export function getSidebar(path: string): SidebarItem[] {
  for (const [prefix, items] of Object.entries(sidebar)) {
    if (path.startsWith(prefix)) {
      return items;
    }
  }
  return [];
}
