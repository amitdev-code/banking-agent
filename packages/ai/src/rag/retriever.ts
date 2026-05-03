import type { ProductType } from '@banking-crm/types';

const TEMPLATES: Record<ProductType, string> = {
  HOME_LOAN: `# Home Loan — Product Context

## Product Overview
A home loan designed for salaried professionals looking to purchase or construct their dream home, with competitive rates and long repayment tenure.

## Key Features
- Loan amount: ₹5 lakhs to ₹5 crores
- Tenure: Up to 30 years
- Interest rate: Starting at 8.4% per annum (floating)
- Up to 90% of property value financed
- Tax benefits under Section 80C and 24(b)
- Balance transfer facility available

## Ideal Customer Profile
- Salaried employee with minimum ₹40,000/month income
- Age 25–55
- Stable employment (12+ months of consistent salary credits)
- Good savings history (average balance ≥ ₹50,000)
- No existing home loan

## Messaging Guidelines
- Highlight the tax savings angle
- Mention the long tenure as a low-EMI benefit
- Acknowledge their financial discipline (good balance, stable income)
- Mention pre-approved eligibility to create urgency
- Tone: aspirational, warm, celebratory of their financial milestone
- Keep message under 250 words
- End with a call to action to speak with a home loan advisor`,

  PERSONAL_LOAN: `# Personal Loan — Product Context

## Product Overview
A flexible personal loan for salaried individuals to meet personal financial goals — home renovation, medical emergencies, education, travel, or debt consolidation.

## Key Features
- Loan amount: ₹50,000 to ₹40 lakhs
- Tenure: 12 to 60 months
- Interest rate: Starting at 10.5% per annum
- No collateral required
- Disbursal within 24–48 hours
- Flexible EMI options

## Ideal Customer Profile
- Salaried employee with regular monthly credit
- Age 21–60
- Minimum salary: ₹15,000/month
- Stable employment history (regular salary credits)

## Messaging Guidelines
- Highlight speed of approval and disbursal
- Emphasize no collateral needed
- Acknowledge the customer's spending patterns as evidence of eligibility
- Offer to calculate EMI based on their income
- Tone: professional, helpful, not pushy
- Keep message under 250 words
- End with a clear call to action (reply YES or click link)`,

  CREDIT_CARD: `# Credit Card — Product Context

## Product Overview
A premium credit card offering rewards, cashback, and lifestyle benefits for customers with high monthly spending on dining, shopping, travel, and entertainment.

## Key Features
- Welcome bonus: 5,000 reward points on first transaction
- 5x reward points on dining and shopping
- 2x reward points on travel and entertainment
- 1% fuel surcharge waiver
- Complimentary airport lounge access (4 visits/year)
- Zero foreign transaction fee on premium variant
- Monthly spend milestone bonuses
- EMI conversion on purchases ≥ ₹3,000

## Ideal Customer Profile
- Regular spender on lifestyle categories (dining, shopping, entertainment)
- Monthly spending ≥ ₹15,000
- Stable income or good account history
- Age 21–55

## Messaging Guidelines
- Lead with the rewards and cashback angle based on their actual spending
- Quantify potential savings ("Based on your spending, you could earn ₹X in rewards")
- Mention the lounge access as a lifestyle upgrade
- Tone: exciting, premium, value-focused
- Avoid making it sound like debt — frame as a spending optimizer
- Keep message under 250 words
- End with a link or "Reply CARD" call to action`,
};

export function getProductTemplate(product: ProductType): string {
  return TEMPLATES[product];
}

export function buildRagContext(products: ProductType[]): string {
  const unique = [...new Set(products)];
  return unique
    .map((p) => `## ${p}\n${getProductTemplate(p)}`)
    .join('\n\n---\n\n');
}
