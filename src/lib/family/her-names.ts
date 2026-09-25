// Her names and her people, as the family says them. These are the starting lists; the
// live lists are edited from the desk (Names) and kept in the family_lists table.
// Relationships are deliberately not shown; only what she calls each person.

export interface HerName { text: string; note?: string; href?: string }
export interface HerPerson { malayalam: string; said: string }

export const MALAYALAM = /[ഀ-ൿ]/

export const HER_NAMES: HerName[] = [
  { text: 'വരദ', note: 'Varada · she who grants boons', href: '/chapters/she-arrives' },
  { text: 'pawpaw', note: "acchan's, for online", href: '/chapters/my-pawpaw' },
  { text: 'pupu', note: "on her 1-month cake · amma's too" },
  { text: 'ചക്കു', note: "chakku · amma's" },
  { text: 'ചുന്ദരമുത്ത്', note: "chundaramutthu · amma's" },
  { text: 'ശങ്കു', note: "shanku · amma's" },
  { text: 'വാവ', note: 'vava' },
  { text: 'മണിക്കുട്ടി', note: 'manikutty' },
  { text: 'bubba · bubbu · V' },
]

export const HER_PEOPLE: HerPerson[] = [
  { malayalam: 'അച്ഛൻ', said: 'acchan' },
  { malayalam: 'അമ്മ', said: 'amma' },
  { malayalam: 'അച്ഛച്ചൻ', said: 'acchachan' },
  { malayalam: 'അച്ഛമ്മ', said: 'acchamma' },
  { malayalam: 'അമ്മായി', said: 'ammayi' },
  { malayalam: 'ശ്രീമാമൻ', said: 'sreemaman · ammavan' },
  { malayalam: 'അമ്മുച്ചി', said: 'ammuchi · amuchi' },
  { malayalam: 'രഘുമാമൻ', said: 'raghumaman · nunnumaman · ammavan' },
]

// The line under her name on Home cycles through every name after the first,
// splitting "bubba · bubbu · V" into its parts.
export function alsoCalled(names: HerName[]): string[] {
  return names.slice(1).flatMap(name => name.text.split('·').map(part => part.trim()).filter(Boolean))
}
