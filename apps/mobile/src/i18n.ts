import { useSession } from './store/session';

const messages = {
  en: { map: 'Map', report: 'Report', verify: 'Verify', manifesto: 'Manifesto', tracker: 'Tracker', me: 'Me', myTgim: 'My TGIM', sync: 'Sync now', notifications: 'Enable notifications' },
  hi: { map: 'मानचित्र', report: 'रिपोर्ट', verify: 'सत्यापन', manifesto: 'घोषणापत्र', tracker: 'ट्रैकर', me: 'मैं', myTgim: 'मेरा TGIM', sync: 'अभी सिंक करें', notifications: 'सूचनाएँ चालू करें' },
  mr: { map: 'नकाशा', report: 'अहवाल', verify: 'पडताळणी', manifesto: 'जाहीरनामा', tracker: 'ट्रॅकर', me: 'मी', myTgim: 'माझे TGIM', sync: 'आता सिंक करा', notifications: 'सूचना सुरू करा' },
} as const;

export type MessageKey = keyof typeof messages.en;
export function useI18n() {
  const { language } = useSession();
  const locale: keyof typeof messages = language === 'hi' || language === 'mr' ? language : 'en';
  return { locale, t: (key: MessageKey) => messages[locale][key] };
}
