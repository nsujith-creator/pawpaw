// Her names and her people, as the family says them. Malayalam where it is said in Malayalam.
// Relationships are deliberately not shown; only what she calls each person.

export interface HerName { text: string; malayalam?: boolean; note?: string; href?: string }

export const HER_NAMES: HerName[] = [
  { text: 'വരദ', malayalam: true, note: 'Varada · she who grants boons', href: '/chapters/she-arrives' },
  { text: 'pawpaw', note: "acchan's, for online", href: '/chapters/my-pawpaw' },
  { text: 'pupu', note: "on her 1-month cake · amma's too" },
  { text: 'ചക്കു', malayalam: true, note: "chakku · amma's" },
  { text: 'ചുന്ദരമുത്ത്', malayalam: true, note: "chundaramutthu · amma's" },
  { text: 'ശങ്കു', malayalam: true, note: "shanku · amma's" },
  { text: 'വാവ', malayalam: true, note: 'vava' },
  { text: 'മണിക്കുട്ടി', malayalam: true, note: 'manikutty' },
  { text: 'bubba · bubbu · V' },
]

// The line under her name on Home cycles through these.
export const ALSO_CALLED: { text: string; malayalam?: boolean }[] = [
  { text: 'pawpaw' }, { text: 'pupu' }, { text: 'വാവ', malayalam: true }, { text: 'chakku' },
  { text: 'മണിക്കുട്ടി', malayalam: true }, { text: 'shanku' }, { text: 'bubbu' },
  { text: 'ചുന്ദരമുത്ത്', malayalam: true }, { text: 'V' },
]

export interface HerPerson { malayalam: string; said: string; last?: boolean }

export const HER_PEOPLE: HerPerson[] = [
  { malayalam: 'അച്ഛൻ', said: 'acchan' },
  { malayalam: 'അമ്മ', said: 'amma' },
  { malayalam: 'അച്ഛച്ചൻ', said: 'acchachan' },
  { malayalam: 'അച്ഛമ്മ', said: 'acchamma' },
  { malayalam: 'അമ്മായി', said: 'ammayi' },
  { malayalam: 'ശ്രീമാമൻ', said: 'sreemaman · ammavan' },
  { malayalam: 'അമ്മുച്ചി', said: 'ammuchi · amuchi' },
  { malayalam: 'രഘുമാമൻ', said: 'raghumaman · ammavan' },
  { malayalam: 'മൗഷി', said: 'maushi', last: true },
]
