/** Corporate content copied verbatim from the website's /corporate page. */
/** Option arrays mirror the server's corporateInquiries route exactly. */
import type { InfoDoc } from './types';

export const CORPORATE: InfoDoc = {
  title: 'Bulk employee testing and corporate diagnostics partnerships',
  subtitle:
    'Build a reliable diagnostics program for your workforce with home collection, onsite camps, recurring testing coordination, and dedicated partnership support.',
  sections: [
    {
      title: 'Corporate Partnerships',
      blocks: [
        {
          type: 'list',
          items: [
            'Bulk coordination: Designed for HR and ops teams managing employee testing at scale.',
            'Dedicated support: A corporate team to help with planning, rollout, and operational follow-through.',
            'Actionable reporting: Structured reporting and program visibility for repeat diagnostics initiatives.',
          ],
        },
      ],
    },
    {
      title: 'Tell us about your corporate requirement',
      blocks: [
        {
          type: 'paragraph',
          text: 'We usually respond within one business day with the right next step for your team.',
        },
      ],
    },
    {
      title: 'How teams typically work with us',
      blocks: [
        {
          type: 'paragraph',
          text: 'From one-time employee health drives to recurring diagnostic programs, we help teams design the right operating model.',
        },
        {
          type: 'list',
          items: [
            'Employee wellness programs: Annual health packages, preventive screening, and workforce wellbeing programs delivered at scale.',
            'Onsite camps: Coordinate sample collection or health camps directly at office sites, plants, or distributed campuses.',
            'Pre-employment testing: Streamline diagnostic workflows for hiring, joining formalities, and operational fitness checks.',
            'Recurring diagnostics partnership: Set up a long-term diagnostics operating model with dedicated support and reporting.',
          ],
        },
      ],
    },
    {
      title: 'Built for operationally demanding diagnostic programs',
      blocks: [
        {
          type: 'paragraph',
          text: 'Coordinate employee testing without forcing HR, admin, or operations teams to manually stitch together partner follow-ups.',
        },
        {
          type: 'paragraph',
          text: 'Use one platform for planning, sample collection coordination, report visibility, and diagnostics support across cities and teams.',
        },
        {
          type: 'paragraph',
          text: 'Whether you need a one-time camp or a long-term diagnostics partner, we help translate requirements into a manageable execution plan.',
        },
      ],
    },
    {
      title: 'What kinds of organizations can work with DocNow?',
      blocks: [
        {
          type: 'paragraph',
          text: 'We support startups, SMBs, large enterprises, schools, manufacturing units, and distributed teams that need employee diagnostic services in bulk.',
        },
      ],
    },
    {
      title: 'Do you support both camps and recurring programs?',
      blocks: [
        {
          type: 'paragraph',
          text: 'Yes. We can help with one-time employee testing drives as well as ongoing diagnostics partnerships.',
        },
      ],
    },
    {
      title: 'How quickly does your corporate team respond?',
      blocks: [
        {
          type: 'paragraph',
          text: 'For qualified leads, our corporate partnerships team typically responds within one business day.',
        },
      ],
    },
  ],
};

export const COMPANY_SIZE_OPTIONS = ['1-50', '51-200', '201-1000', '1000+'] as const;

export const REQUIREMENT_TYPES = [
  'Employee health checkups',
  'Onsite health camps',
  'Pre-employment testing',
  'Recurring diagnostics partnership',
  'Custom requirement',
] as const;

export const CORPORATE_FIELD_LABELS = {
  contactName: 'Contact person name',
  workEmail: 'Work email',
  mobile: 'Mobile number',
  companyName: 'Company name',
  city: 'City / primary service location',
  companySize: 'Company size',
  requirementType: 'Requirement type',
  summary: 'Requirement summary',
};
