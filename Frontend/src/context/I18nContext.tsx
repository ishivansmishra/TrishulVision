import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type Locale = 'en' | 'hi' | 'mr';

type Dict = Record<string, string>;

const dictionaries: Record<Locale, Dict> = {
  en: {
    app_title: 'TrishulVision',
    ai_assistant: 'AI Assistant',
    authority_support: 'Authority Support',
    user_support: 'User Support',
    assistant_greeting: "Hello! I'm your AI assistant. How can I help you today?",
    authority_portal: 'Authority Portal',
    user_portal: 'User Portal',
    explore_features: 'Explore Features 2025',
    dashboard: 'Dashboard',
    detection: 'Detection',
    reports: 'Reports',
    visualization: 'Visualization',
    alerts: 'Alerts',
    analytics: 'Analytics',
    home: 'Home',
    map2d: '2D Map',
    terrain3d: '3D Terrain / Mining Scene',
    time_lapse: 'Time-lapse Playback',
    layer_controls: 'Layer Controls',
    mining_detection: 'Mining Detection (EO/SAR)',
    features_heading: 'Advanced Mining Surveillance',
    feature_satellite_title: 'Satellite Detection',
    feature_satellite_desc: 'AI-powered analysis of EO/SAR satellite imagery for precise mining site identification',
    feature_3d_title: '3D Visualization',
    feature_3d_desc: 'Advanced DEM-based terrain analysis with depth estimation and volume calculation',
    feature_blockchain_title: 'Blockchain Verified',
    feature_blockchain_desc: 'Immutable report validation and cryptographic hash verification',
    feature_dual_title: 'Dual Portal System',
    feature_dual_desc: 'Separate interfaces for authorities and mining operators with role-based access',
    tech_in_action: 'Our Technology in Action',
    ai_powered_analysis: 'AI-Powered Analysis',
    time_lapse_desc: 'Use detection jobs and satellite basemaps to view temporal change.',
    date: 'Date',
    show_imagery: 'Show Imagery',
    play: 'Play',
    stop: 'Stop',
    scrub: 'Scrub',
    speed: 'Speed',
    speed_slow: 'Slow',
    speed_normal: 'Normal',
    speed_fast: 'Fast',
    layer: 'Layer',
    apply: 'Apply',
    recent_jobs: 'Recent jobs',
    no_jobs: 'No jobs available.',
    job: 'Job',
    open_viz: 'Open Viz',
    viz_fetched: 'Visualization JSON fetched. Open on 3D page.'
  },
  hi: {
    app_title: 'त्रिशूलविजन',
    ai_assistant: 'एआई सहायक',
    authority_support: 'प्राधिकरण सहायता',
    user_support: 'उपयोगकर्ता सहायता',
    assistant_greeting: 'नमस्ते! मैं आपका एआई सहायक हूँ। मैं आपकी किस प्रकार सहायता कर सकता/सकती हूँ?',
    authority_portal: 'प्राधिकरण पोर्टल',
    user_portal: 'उपयोगकर्ता पोर्टल',
    explore_features: 'फीचर्स 2025 देखें',
    dashboard: 'डैशबोर्ड',
    detection: 'डिटेक्शन',
    reports: 'रिपोर्ट्स',
    visualization: 'विज़ुअलाइज़ेशन',
    alerts: 'अलर्ट्स',
    analytics: 'एनालिटिक्स',
    home: 'होम',
    map2d: '2D मानचित्र',
    terrain3d: '3D टेरेन / माइनिंग सीन',
    time_lapse: 'टाइम-लैप्स',
    layer_controls: 'लेयर कंट्रोल्स',
    mining_detection: 'माइनिंग डिटेक्शन (EO/SAR)',
    features_heading: 'उन्नत माइनिंग निगरानी',
    feature_satellite_title: 'सैटेलाइट डिटेक्शन',
    feature_satellite_desc: 'EO/SAR सैटेलाइट इमेजरी का एआई आधारित विश्लेषण सटीक माइनिंग साइट पहचान हेतु',
    feature_3d_title: '3D विज़ुअलाइज़ेशन',
    feature_3d_desc: 'डीईएम आधारित भू-भाग विश्लेषण गहराई और वॉल्यूम आकलन के साथ',
    feature_blockchain_title: 'ब्लॉकचेन सत्यापन',
    feature_blockchain_desc: 'अपरिवर्तनीय रिपोर्ट वैधता और क्रिप्टोग्राफिक हैश सत्यापन',
    feature_dual_title: 'डुअल पोर्टल सिस्टम',
    feature_dual_desc: 'प्राधिकरण और ऑपरेटरों के लिए रोल-आधारित अलग-अलग इंटरफेस',
    tech_in_action: 'हमारी तकनीक की झलक',
    ai_powered_analysis: 'एआई आधारित विश्लेषण',
    time_lapse_desc: 'डिटेक्शन जॉब्स और सैटेलाइट बेसमैप्स से समय-आधारित बदलाव देखें।',
    date: 'तारीख',
    show_imagery: 'इमेजरी दिखाएं',
    play: 'चलाएँ',
    stop: 'रोकें',
    scrub: 'स्क्रब',
    speed: 'स्पीड',
    speed_slow: 'धीमा',
    speed_normal: 'सामान्य',
    speed_fast: 'तेज़',
    layer: 'लेयर',
    apply: 'लागू करें',
    recent_jobs: 'हाल के जॉब्स',
    no_jobs: 'कोई जॉब उपलब्ध नहीं।',
    job: 'जॉब',
    open_viz: 'विज़ खोलें',
    viz_fetched: 'विज़ुअलाइज़ेशन JSON प्राप्त हुआ। 3D पेज पर खोलें।'
  },
  mr: {
    app_title: 'त्रिशूलव्हिजन',
    ai_assistant: 'एआय सहाय्यक',
    authority_support: 'प्राधिकरण सहाय्य',
    user_support: 'वापरकर्ता सहाय्य',
    assistant_greeting: 'नमस्कार! मी तुमचा एआय सहाय्यक आहे. मी कशी मदत करू?',
    authority_portal: 'प्राधिकरण पोर्टल',
    user_portal: 'वापरकर्ता पोर्टल',
    explore_features: 'वैशिष्ट्ये 2025 पाहा',
    dashboard: 'डॅशबोर्ड',
    detection: 'डिटेक्शन',
    reports: 'अहवाल',
    visualization: 'व्हिज्युअलायझेशन',
    alerts: 'अलर्ट्स',
    analytics: 'विश्लेषण',
    home: 'मुख्यपृष्ठ',
    map2d: '2D नकाशा',
    terrain3d: '3D भूभाग / खाण दृश्य',
    time_lapse: 'टाईम-लॅप्स',
    layer_controls: 'लेयर नियंत्रण',
    mining_detection: 'मायनिंग डिटेक्शन (EO/SAR)',
    features_heading: 'प्रगत खाण निरीक्षण',
    feature_satellite_title: 'उपग्रह डिटेक्शन',
    feature_satellite_desc: 'EO/SAR उपग्रह प्रतिमांचे एआय-आधारित विश्लेषण अचूक खाण साइट ओळखीसाठी',
    feature_3d_title: '3D व्हिज्युअलायझेशन',
    feature_3d_desc: 'DEM-आधारित भू-भाग विश्लेषण खोली आणि खंड अंदाजासह',
    feature_blockchain_title: 'ब्लॉकचेन सत्यापन',
    feature_blockchain_desc: 'अपरिवर्तनीय अहवाल वैधता आणि क्रिप्टोग्राफिक हॅश पडताळणी',
    feature_dual_title: 'दुहेरी पोर्टल प्रणाली',
    feature_dual_desc: 'प्राधिकरण आणि ऑपरेटरसाठी भूमिकाधारित स्वतंत्र इंटरफेस',
    tech_in_action: 'आमची तंत्रज्ञान कृतीत',
    ai_powered_analysis: 'एआय-आधारित विश्लेषण',
    time_lapse_desc: 'डिटेक्शन जॉब्स आणि उपग्रह बेसमॅप्सने समयवार बदल पाहा.',
    date: 'तारीख',
    show_imagery: 'इमेजरी दाखवा',
    play: 'प्ले',
    stop: 'थांबवा',
    scrub: 'स्क्रब',
    speed: 'गती',
    speed_slow: 'मंद',
    speed_normal: 'सामान्य',
    speed_fast: 'जलद',
    layer: 'लेयर',
    apply: 'लागू करा',
    recent_jobs: 'अलीकडील जॉब्स',
    no_jobs: 'जॉब उपलब्ध नाहीत.',
    job: 'जॉब',
    open_viz: 'व्हिझ उघडा',
    viz_fetched: 'व्हिज्युअलायझेशन JSON मिळाले. 3D पानावर उघडा.'
  },
};

type I18nContextType = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
};

const I18nContext = createContext<I18nContextType | null>(null);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocale] = useState<Locale>(() => (localStorage.getItem('tv_locale') as Locale) || 'en');
  useEffect(() => { try { localStorage.setItem('tv_locale', locale); } catch {} }, [locale]);
  const t = useMemo(() => (key: string) => dictionaries[locale]?.[key] || dictionaries.en[key] || key, [locale]);
  const value = useMemo(() => ({ locale, setLocale, t }), [locale, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
};
