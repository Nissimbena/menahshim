/**
 * Minimal i18n layer - NOT a full framework, just enough for a two-language
 * (Hebrew/English) UI toggle. Only UI chrome strings live here; dynamic
 * content that comes from the database (team names, player names, game
 * descriptions) is Hebrew-only today and is NOT translated by this file -
 * that would need English columns added to the players/teams data first.
 */
export type Lang = "he" | "en";

const LANG_KEY = "lang";

type Dict = Record<string, string>;

const translations: Record<Lang, Dict> = {
  he: {
    "common.back": 'לו"ז',
    "common.backBtn": "חזרה",
    "common.yes": "כן",
    "common.no": "לא",
    "common.countdown.locked": "ההימור ננעל",
    "common.countdown.day": "יום",
    "common.countdown.days": "ימים",
    "common.loading": "טוען...",
    "scoring.error": "שגיאה בטעינת חוקי הניקוד.",

    "home.signIn": "התחברות עם Google",
    "home.signOut": "התנתקות",
    "home.install": "התקנת האפליקציה",
    "home.myScore": "הניקוד שלי",
    "home.about": "מי אנחנו",
    "home.privacy": "מדיניות פרטיות",
    "home.tournamentBadge": "טורניר מיוחד",
    "home.tournamentTitle": "טורניר ה-VIP",
    "home.tournamentDescRules": "6 המשחקים הקרובים בלבד - אותם חוקי ניקוד",
    "home.tournamentDesc": "6 המשחקים הקרובים בלבד",
    "home.tournamentPrize":
      "הפרס לזוכה: זוג כרטיסי VIP למשחק מול הפועל אילת",
    "home.tournamentBtn": "לטבלת הטורניר",
    "home.schedule.title": 'לו"ז העונה',
    "home.tab.upcoming": "משחקים קרובים ({n})",
    "home.tab.finished": "משחקים שהסתיימו ({n})",
    "home.game.nextBadge": "המשחק הבא",
    "home.game.vs": "נגד",
    "home.game.timeTBD": "שעה טרם נקבעה",
    "home.game.prizeBadge": "משחק עם פרס",
    "home.game.prizeLabel": "הפרס: {prize}",
    "home.game.viewMyPrediction": "צפו בניחוש שלכם",
    "home.game.viewAveragePrediction": "צפו בממוצע הניחושים",
    "home.game.viewPrediction": "צפה בניחוש",
    "home.game.predict": "נחשו את המשחק",
    "home.game.locked": "המשחק ננעל",
    "home.game.opensAfterPrevious": "ייפתח לאחר נעילת המשחק הקודם",
    "home.game.festivalDetails": "פרטים על הפסטיבל",
    "home.signInError": "שגיאה בהתחברות: {msg}",
    "home.menu.leaderboard": "לוח מובילים",
    "home.menu.scoringInfo": "איך עובד הניקוד?",
    "home.menu.timeKiller": "מעבירים את הזמן",
    "home.menu.createLeague": "צור ליגה",
    "home.menu.leagueTable": "טבלת ליגת {name}",
    "home.menu.admin": "הזנת תוצאה (אדמין)",
    "home.menu.myChallenges": "האתגרים שלי",
    "home.whatsappGroup.label": "הצטרפו לקבוצת הדיונים בוואטסאפ",
    "home.menu.sportsWorld": "עולם הספורט",

    "sportsHub.home.title": "עולם הספורט",
    "sportsHub.home.subtitle": "בחרו ענף ספורט כדי לראות את הליגות והקבוצות",
    "sportsHub.comingSoon": "בקרוב",
    "sportsHub.leagues.title": "ליגות {sport}",
    "sportsHub.leagues.none": "עדיין אין ליגות פעילות לענף הספורט הזה - בקרוב!",
    "sportsHub.teams.title": "בחרו קבוצה",
    "sportsHub.teams.none": "לא נמצאו קבוצות לליגה זו.",
    "sportsHub.teamPage.noGames": "אין עדיין משחקים שמורים לקבוצה זו.",

    "prediction.step.score": "תוצאה סופית",
    "prediction.step.stats": "שאלות אישיות",
    "prediction.step.team": "נתוני קבוצה",
    "prediction.step.summary": "סיכום",
    "prediction.category.scorer": "מוביל הקליעה",
    "prediction.category.scorer.amount": "נקודות",
    "prediction.category.rebounder": "מוביל הריבאונדים",
    "prediction.category.rebounder.amount": "ריבאונדים",
    "prediction.category.assist": "מוביל האסיסטים",
    "prediction.category.assist.amount": "אסיסטים",
    "prediction.loadingMyPrediction": "טוען את הניחוש שלכם…",
    "prediction.header.title": "נחשו את המשחק",
    "prediction.header.subtitle":
      "הפועל ירושלים נגד {opponent} · {date}",
    "prediction.squadPanelTitle": "הסגל הרשמי למשחק הערב",
    "prediction.scoreStep.question": "מה תהיה התוצאה הסופית?",
    "prediction.carousel.prev": "השחקן הקודם",
    "prediction.carousel.next": "השחקן הבא",
    "prediction.loadingPlayers": "טוען שחקנים…",
    "prediction.statsStep.question": "מי יהיה {label}, וכמה?",
    "prediction.nav.next": "הבא: {label}",
    "prediction.nav.toSummary": "לסיכום הניחוש",
    "prediction.teamStep.question": "כמה תקלע הקבוצה בסך הכל?",
    "prediction.teamStep.threes": "שלשות",
    "prediction.teamStep.rebounds": "ריבאונדים",
    "prediction.teamStep.assists": "אסיסטים",
    "prediction.error.range": "הערך חייב להיות בין {min} ל-{max}",
    "prediction.error.fixToContinue": "צריך לתקן את הערכים המסומנים כדי להמשיך",
    "prediction.summary.notSelected": "לא נבחר",
    "prediction.summary.foreignHeading": "זרים שינחשתם שישחקו",
    "prediction.summary.noForeignSelected": "לא נבחר אף זר",
    "prediction.summary.threes": "שלשות שניחשתם לקבוצה:",
    "prediction.summary.rebounds": "ריבאונדים שניחשתם לקבוצה:",
    "prediction.summary.assists": "אסיסטים שניחשתם לקבוצה:",
    "prediction.breakdown.title": "מה ניחשתם מול מה שקרה בפועל",
    "prediction.breakdown.teamThrees": "שלשות קבוצה",
    "prediction.breakdown.teamRebounds": "ריבאונדים קבוצה",
    "prediction.breakdown.teamAssists": "אסיסטים קבוצה",
    "prediction.breakdown.totalScore": 'סה"כ ניקוד למשחק הזה: {score}',
    "prediction.breakdown.header.category": "קטגוריה",
    "prediction.breakdown.header.predicted": "ניחשתם",
    "prediction.breakdown.header.actual": "בפועל",
    "prediction.breakdown.header.points": "נקודות",
    "prediction.viewOnly.hasPrediction":
      "כבר הגשתם ניחוש למשחק הזה - הנה מה שניחשתם:",
    "prediction.viewOnly.noPrediction":
      "לא הגשתם ניחוש למשחק הזה - הנה איך ניחשו כולם:",
    "prediction.viewOnly.edit": "עריכת הניחוש",
    "prediction.viewOnly.backToSchedule": 'חזרה ללו"ז',
    "prediction.connectingGoogle": "מתחברים עם Google…",
    "prediction.submitted.title": "הניחוש נשלח!",
    "prediction.submitted.message":
      "בהצלחה — חזרו אחרי המשחק כדי לראות את הניקוד שלכם.",
    "prediction.error.title": "משהו השתבש",
    "prediction.error.message": "ההתחברות/שליחה נכשלה. נסו שוב.",
    "prediction.summary.backToEdit": "חזרה: עריכה",
    "prediction.summary.submit": "שליחת הניחוש",
    "prediction.aggregate.heading": "כך ניחשו כל המנחשים ({n})",
    "prediction.aggregate.avgScore": "התוצאה הממוצעת שניחשו: {home} - {away}",
    "prediction.aggregate.avgThrees": "ממוצע שלשות שניחשו: {v}",
    "prediction.aggregate.avgRebounds": "ממוצע ריבאונדים שניחשו: {v}",
    "prediction.aggregate.avgAssists": "ממוצע אסיסטים שניחשו: {v}",
    "prediction.aggregate.mostPicked":
      "רוב המנחשים בחרו ב-{player} כ{label}{avgSuffix}",
    "prediction.aggregate.avgSuffix": ", בממוצע {avg}",
    "prediction.aggregate.unknownPlayer": "שחקן",

    "leaderboard.title": "לוח מובילים",
    "leaderboard.lastGameTitle": "ניקוד המשחק האחרון",
    "leaderboard.loading": "טוען לוח מובילים…",
    "leaderboard.error": "שגיאה בטעינת לוח המובילים.",
    "leaderboard.empty": "עדיין אין תוצאות מדורגות. חזרו אחרי המשחק הראשון!",
    "leaderboard.overall": "מוביל כללי",
    "leaderboard.selectPastGame": "בחרו משחק לצפייה בדירוג",
    "leaderboard.userPrediction.title": "ההימור של {name}",
    "leaderboard.userPrediction.none": "לא נמצא ניחוש של המשתמש הזה למשחק הזה.",
    "leaderboard.userPrediction.error": "שגיאה בטעינת הניחוש.",

    "tournament.title": "טורניר ה-VIP",
    "tournament.badge": "טורניר מיוחד",
    "tournament.desc":
      "הניקוד נספר רק על פני 6 המשחקים הבאים, לפי אותם חוקי ניקוד הרגילים",
    "tournament.prize": "הפרס לזוכה: {prize}",
    "tournament.loading": "טוען טבלת טורניר…",
    "tournament.error": "שגיאה בטעינת טבלת הטורניר.",
    "tournament.empty":
      "עדיין אין תוצאות בטורניר. חזרו אחרי המשחק הראשון מתוך השישה!",

    "privacy.title": "מדיניות פרטיות",
    "privacy.s1.title": "אילו נתונים אנחנו אוספים",
    "privacy.s1.r1":
      "בהתחברות עם Google: כתובת אימייל, שם תצוגה ותמונת פרופיל.",
    "privacy.s1.r2": "כינוי (Nickname) שבחרתם להצגה בטבלת המובילים.",
    "privacy.s1.r3": "הניחושים/ההימורים שהגשתם, לצורך חישוב ניקוד ודירוג.",
    "privacy.s1.r4":
      "במקרה של שגיאה טכנית: הודעת השגיאה, סוג מכשיר ודפדפן - לצורך איתור ותיקון באגים בלבד.",
    "privacy.s2.title": "למה אנחנו משתמשים בנתונים",
    "privacy.s2.r1":
      "הצגת שמכם/כינוי בטבלת המובילים ובליגות פרטיות שהצטרפתם אליהן.",
    "privacy.s2.r2": "חישוב ניקוד ודירוג מול שאר המשתתפים.",
    "privacy.s2.r3": "איתור ותיקון תקלות טכניות באפליקציה.",
    "privacy.s3.title": "עם מי המידע משותף",
    "privacy.s3.r1":
      "המידע מאוחסן אצל ספקי תשתית (Google Firebase / Google Cloud) ואינו מועבר לגורם שלישי לצורכי שיווק.",
    "privacy.s3.r2":
      "שם/כינוי וניקוד גלויים לשאר המשתמשים באפליקציה (טבלת מובילים).",
    "privacy.s4.title": "הזכויות שלכם",
    "privacy.s4.r1":
      'ניתן לבקש בכל עת למחוק את החשבון ואת כל המידע האישי המשויך אליו - ראו כפתור "מחיקת חשבון" בתחתית עמוד זה (למשתמשים מחוברים).',
    "privacy.s4.r2":
      "לכל שאלה נוספת או בקשה לעיון במידע - ניתן לפנות אלינו ישירות.",
    "privacy.delete.title": "מחיקת חשבון",
    "privacy.delete.desc":
      "לחיצה על הכפתור תמחק לצמיתות את החשבון, הניחושים וכל המידע האישי שלך. פעולה זו אינה הפיכה.",
    "privacy.delete.confirm":
      "למחוק את החשבון וכל הניחושים/המידע האישי שלך לצמיתות? פעולה זו אינה הפיכה.",
    "privacy.delete.failed": "מחיקת החשבון נכשלה, נסו שוב מאוחר יותר.",

    "about.title": "מי אנחנו",
    "about.intro":
      'אני נרגש להציג בפניכם את "מנאחסים" – המשחק החדש והבלעדי לאוהדי הפועל ירושלים, שבו אנחנו מנחשים (וגם מנאחסים 😉) את הביצועים של הקבוצה.',
    "about.highlightsTitle": "כמה דגשים על המשחק:",
    "about.nonProfitTitle": "ללא כוונת רווח",
    "about.nonProfitText":
      "המשחק נבנה מתוך רצון ליצור עוד משהו נחמד וכיף לקהילה שלנו.",
    "about.prizesTitle": "פרסים וחסויות",
    "about.prizesText":
      "מדי פעם יחולקו פרסים שנתרמו באהבה. אם יש לכם עסק שרוצה לקחת חלק ולתרום פרס - מוזמנים לפנות אליי, ונוסיף בשמחה פרסום קטן לעסק שלכם.",
    "about.feedback": "אשמח מאוד לשמוע מה דעתכם ומה כדאי לשפר.",
    "about.closing": "שיהיה לנו בהצלחה,",
    "about.cheer": "יאללה הפועל! 🔴⚪",
    "about.contactAvailable": "זמין תמיד",

    "admin.title": "הזנת תוצאה אמיתית",
    "admin.selectGame": "בחר משחק",
    "admin.selectPlaceholder": "-- בחר --",
    "admin.gameOption": "נגד {opponent} ({count} הימרו)",
    "admin.countLine": "{count} הימרו על המשחק הזה עד כה",
    "admin.statsQuestion": "מי הוביל את הקבוצה בפועל, וכמה?",
    "admin.player": "שחקן",
    "admin.teamStatsQuestion": "כמה קלעה הקבוצה בפועל?",
    "admin.bonusQuestionLabel": "שאלת בונוס - {points} נקודות",
    "admin.scoreQuestion": "תוצאה סופית",
    "admin.home": "בית",
    "admin.away": "חוץ",
    "admin.saveButton": "שמור תוצאה ודרג ניחושים",
    "admin.saving": "שומר ודרג…",
    "admin.saved": "נשמר! דורגו {count} ניחושים.",
    "admin.saveFailed": "שגיאה בשמירה. נסו שוב.",

    "nickname.title": "ברוכים הבאים!",
    "nickname.subtitle": "בחרו כינוי שיוצג בלוח המובילים",
    "nickname.placeholder": "לדוגמה: קפטן הפועל",
    "nickname.errorLength": "הכינוי צריך להיות בין 2 ל-24 תווים",
    "nickname.errorTaken": "הכינוי הזה כבר תפוס, נסו כינוי אחר",
    "nickname.errorGeneral": "שגיאה בשמירה, נסו שוב",
    "nickname.save": "שמירה",

    "league.create.title": "יצירת ליגה פרטית",
    "league.create.subtitle":
      "תנו שם לליגה - חברים שיצטרפו איתה יתחרו רק ביניכם",
    "league.create.placeholder": "לדוגמה: חבורת הפועל",
    "league.create.errorLength": "שם הליגה צריך להיות בין 2 ל-60 תווים",
    "league.create.success": "הליגה נוצרה! שלחו את הקישור הזה לחברים:",
    "league.create.copyLink": "העתקת קישור",
    "league.create.copied": "הועתק!",
    "league.create.createBtn": "יצירת ליגה",
    "league.create.closeBtn": "סגירה",
    "league.create.error": "שגיאה ביצירת הליגה, נסו שוב",

    "league.join.title": "הצטרפות לליגה",
    "league.join.invited": 'הוזמנתם להצטרף לליגה "{name}"',
    "league.join.joinBtn": "הצטרפות לליגה",
    "league.join.cancelBtn": "לא עכשיו",
    "league.join.error": "שגיאה בהצטרפות לליגה, נסו שוב",

    "timeKiller.title": "מעבירים את הזמן בדרך למשחק",
    "timeKiller.intro": "כמה המלצות טובות לדרך:",
    "timeKiller.cta": "האזנה בספוטיפיי",

    "install.title": "הוספת קיצור דרך",
    "install.prompt": "רוצים להוסיף קיצור דרך למנאחסים במסך הבית שלכם?",
    "install.yes": "כן, הוסיפו",
    "install.never": "לא רוצה, אל תראה לי שוב",
    "install.stepsIos":
      'הקישו על כפתור השיתוף ⬆️ בתחתית המסך, ואז על "הוספה למסך הבית".',
    "install.stepsOther":
      'פתחו את תפריט הדפדפן (⋮ או ⋯) ובחרו "התקנת אפליקציה" או "הוספה למסך הבית".',
    "install.ok": "הבנתי",

    "scoring.s1.r1": "תוצאה מדויקת (שני הצדדים): {points} נקודות",
    "scoring.s1.r2":
      "הפרש נקודות מדויק (התוצאה עצמה לא מדויקת אך הפער והכיוון נכונים): {points} נקודות",
    "scoring.s1.r2b": "הפרש של +-{range} וכיוון נכון: {points} נקודות",
    "scoring.s1.r3": "כיוון נכון בלבד (ניחשתם נכון מי ינצח): {points} נקודות",
    "scoring.s2.title": "מובילי הקבוצה (קליעה / ריבאונדים / אסיסטים)",
    "scoring.s2.r1": "בחירת השחקן המצטיין הנכון: {points} נקודות",
    "scoring.s2.r2": "פגיעה בול בכמות (בנוסף, אם השחקן נכון): {points} נקודות",
    "scoring.s2.r3":
      "פגיעה בטווח של ±{range} (בנוסף, אם השחקן נכון): {points} נקודות",
    "scoring.s3.title": 'שובר שוויון בין שחקנים (מי נחשב "המוביל" בפועל)',
    "scoring.s3.r1":
      "קליעה: אם שני שחקנים מסיימים עם אותו מספר נקודות - המוביל ייקבע לפי אחוז הקליעה מהשדה הגבוה יותר, ואם גם זה שווה - מי ששיחק פחות דקות.",
    "scoring.s3.r2":
      "ריבאונדים: אם שני שחקנים מסיימים עם אותו מספר ריבאונדים - המוביל ייקבע לפי מי שצבר יותר ריבאונד התקפה, ואם גם זה שווה - מי ששיחק פחות דקות.",
    "scoring.s3.r3":
      "אסיסטים: אם שני שחקנים מסיימים עם אותו מספר אסיסטים - המוביל ייקבע לפי מי שצבר פחות איבודים, ואם גם זה שווה - מי ששיחק פחות דקות.",
    "scoring.s4.title": "נתוני קבוצה (שלשות / ריבאונדים / אסיסטים)",
    "scoring.s4.r1": "פגיעה בול בכמות: {points} נקודות",
    "scoring.s4.r2": "פגיעה בטווח של ±{range}: {points} נקודות",
    "scoring.s5.title": "שובר שוויון",
    "scoring.s5.r1":
      "במקרה של שוויון בנקודות בין שני אוהדים או יותר - הראשון שהגיש את הניחוש שלו יהיה המדורג הגבוה יותר.",
    "challenge.rules.title": "אתגר חבר",
    "challenge.rules.r1":
      "אתגר חבר הוא הימור נפרד מהניחושים הרגילים: שני אוהדים מהמרים 10 נקודות ישירות אחד מול השני על שאלת כן/לא בנושא המשחק.",
    "challenge.rules.r2":
      "אפשר ליצור אתגר רק על המשחק הפעיל (הבא בתור לניחוש) - כותבים שאלה ובוחרים מה לדעתכם התשובה תהיה.",
    "challenge.rules.r3":
      "כדי ליצור אתגר או להצטרף אליו צריך לפחות 10 נקודות בקופה שלכם.",
    "challenge.rules.r4":
      "ברגע שחבר מצטרף דרך הקישור ששיתפתם, הוא לוקח אוטומטית את הצד ההפוך לתשובה שבחרתם - אין צורך לבחור תשובה בעצמו.",
    "challenge.rules.r5":
      "אפשר להיות מעורבים (כיוצרים או כמאותגרים) בכל רגע נתון באתגר אחד בלבד לכל משחק.",
    "challenge.rules.r6":
      "לאחר המשחק, קובעים מי צדק - הזוכה מקבל 10 נקודות מהמפסיד, וזה מצטרף ישירות לניקוד הכולל בלוח המובילים.",
    "challenge.rules.r7":
      "המטרה של המשחק היא להנות, ואנחנו סומכים שכולם ישחקו בהגינות - אבל כדי למנוע נסיונות לא הוגנים, כל שאלה נבדקת, ואם היא תתברר כלא הגיונית האתגר יבוטל וללא חלוקת נקודות בין הצדדים.",

    "challenge.gameBtn": "אתגר חבר",
    "challenge.modal.title": "אתגר חבר",
    "challenge.modal.checkError": "שגיאה בבדיקת הזכאות ליצירת אתגר. נסו שוב.",
    "challenge.modal.alreadyInChallenge": "כבר יש לך אתגר פתוח למשחק הזה.",
    "challenge.modal.notEnoughPoints":
      "אין לך מספיק נקודות ליצירת אתגר (יש לך {score}, נדרשות {points}).",
    "challenge.modal.intro":
      "כתבו שאלת כן/לא, בחרו מה אתם חושבים שהתשובה תהיה, והמרו 10 נקודות מול חבר",
    "challenge.modal.placeholder": "לדוגמה: האם נמרוד לוי יקלע שלשה?",
    "challenge.modal.errorLength": "השאלה צריכה להיות בין 3 ל-300 תווים",
    "challenge.modal.created": "האתגר נוצר! שלחו את הקישור הזה לחבר:",
    "challenge.modal.whatsappBtn": "שיתוף בוואטסאפ",
    "challenge.modal.createBtn": "יצירת אתגר (10 נקודות)",
    "challenge.modal.errorGeneric": "שגיאה ביצירת האתגר, נסו שוב",
    "challenge.modal.whatsappMessage":
      "🤝 אתגר אותך! {question}\nלחצו כדי להצטרף: {link}",

    "challenge.join.statusActive": "האתגר הזה כבר נתפס על ידי מישהו אחר.",
    "challenge.join.statusResolved": "האתגר הזה כבר הסתיים.",
    "challenge.join.statusCancelled": "האתגר הזה בוטל.",
    "challenge.join.ownChallenge":
      "זה האתגר שיצרתם בעצמכם - שתפו את הקישור עם חבר כדי שיוכל להצטרף.",
    "challenge.join.challengerLine": "{name} מאתגר/ת אתכם:",
    "challenge.join.creatorGuess": "הניחוש של {name}:",
    "challenge.join.yourSide": "אתם תמרו על {answer} - {points} נקודות על הכף.",
    "challenge.join.joinBtn": "הצטרפות לאתגר",
    "challenge.join.notNow": "לא עכשיו",
    "challenge.join.errorGeneric": "שגיאה בהצטרפות לאתגר, נסו שוב",

    "admin.linkStats.title": "סטטיסטיקת קליקים",
    "admin.linkStats.empty": "אין עדיין נתונים.",
    "admin.linkStats.link": "לינק",
    "admin.linkStats.source": "מקור",
    "admin.linkStats.count": "כמות",
    "admin.linkStats.last": "אחרון",
    "admin.challenges.title": "אתגרי חברים",
    "admin.challenges.empty": "אין עדיין אתגרים.",
    "admin.challenges.game": "משחק",
    "admin.challenges.statusPending": "ממתין ליריב",
    "admin.challenges.statusActive": "פעיל - ממתין להכרעה",
    "admin.challenges.statusResolved": "נפתר",
    "admin.challenges.statusCancelled": "בוטל",
    "admin.challenges.noOpponent": "(אין יריב עדיין)",
    "admin.challenges.winnerLabel": "זוכה: {name}",
    "admin.challenges.won": "{name} ניצח/ה",
    "admin.challenges.cancelBtn": "ביטול האתגר",
    "admin.challenges.cancelReasonPrompt":
      "לבטל את האתגר הזה? אפשר להוסיף סיבה (לא חובה), היא תוצג למשתתפים:",
    "admin.challenges.cancellationReasonLabel": "סיבת הביטול: {reason}",
    "admin.challenges.resolveError": "שגיאה בקביעת הזוכה, נסו שוב",
    "admin.challenges.cancelError": "שגיאה בביטול האתגר, נסו שוב",
    "admin.challenges.notValidated": "טרם נבדק",
    "admin.challenges.selectGamePrompt": "בחרו משחק כדי לראות את האתגרים שלו",
    "admin.challenges.gameOption": "{date} - נגד {opponent} ({count} אתגרים)",
    "admin.challenges.showClosed": "הצג גם סגורים",
    "admin.challenges.resolveQuestion": "מה הייתה התשובה בפועל?",
    "admin.challenges.noneForGame": "אין אתגרים למשחק הזה.",
    "admin.challenges.resolveLocked":
      "יש להזין קודם את תוצאת המשחק הראשי (למטה) כדי לקבוע תשובות לאתגרים.",

    "challenge.cancelNotice.title": "האתגר שלכם בוטל",
    "challenge.cancelNotice.questionLabel": "השאלה: {question}",
    "challenge.cancelNotice.reasonLabel": "הסיבה: {reason}",
    "challenge.cancelNotice.noReason": "לא צוינה סיבה.",

    "myChallenges.title": "האתגרים שלי",
    "myChallenges.error": "שגיאה בטעינת האתגרים שלכם.",
    "myChallenges.empty": "עדיין לא יצרתם או הצטרפתם לאתגרים.",
    "myChallenges.you": "(אתם)",
    "myChallenges.shareAgain": "שתפו שוב:",

    "scoring.prize.title": "פרס פיזי במשחקים נבחרים",
    "scoring.prize.r1":
      "בחלק מהמשחקים, המנצח (מי שצבר הכי הרבה נקודות על אותו משחק) יקבל פרס ייחודי פיזי, שיינתן במשחק הבא שישוחק בארנה.",
    "scoring.prize.r2": "אם המנצח לא יגיע למשחק ההוא - הוא יאבד את הזכות לפרס.",
    "scoring.prize.r3":
      'משחקים שמזכים בפרס מסומנים בלוגו מיוחד ליד המשחק בלו"ז.',
    "scoring.sponsor.title": "מחפשים ספונסר",
    "scoring.sponsor.text":
      "אני מחפש כרגע ספונסר לפרס מגניב שיחולק למי שיזכה בסוף העונה - מי שמעוניין לתת את הפרס מוזמן לפנות אלי: 0542538749",

    // ---- Redesign (2026-10): navigation, home, flow, shared components ----
    "common.decrease": "הפחתה",
    "common.increase": "הוספה",
    "nav.home": "בית",
    "nav.leaderboard": "מובילים",
    "nav.leagues": "ליגות ואתגרים",
    "nav.more": "עוד",
    "nav.label": "ניווט ראשי",
    "nav.signIn": "התחברות",
    "nav.account": "החשבון שלי",
    "nav.pointsShort": "נק׳",
    "nav.language": "שפה",
    "lang.he": "עברית",
    "lang.en": "English",
    "home.hero.overline": "המשחק הבא · {competition}",
    "home.hero.lockIn": "עד נעילת הניחושים",
    "home.hero.viewOrEdit": "צפו בניחוש שלכם / עריכה",
    "home.hero.empty": "אין משחקים קרובים כרגע",
    "home.hero.emptyText": 'הלו"ז יתעדכן ברגע שהמשחק הבא ייקבע.',
    "home.countdown.days": "ימים",
    "home.countdown.hours": "שעות",
    "home.countdown.minutes": "דקות",
    "home.strip.label": "הסיכום האישי שלי",
    "home.strip.score": "הניקוד שלי",
    "home.strip.rank": "המיקום שלי",
    "home.strip.leagues": "ליגות",
    "home.signInCard.title": "התחברו כדי להשתתף",
    "home.signInCard.text": "הניקוד, המיקום בטבלה והליגות שלכם יופיעו כאן.",
    "home.tab.upcomingShort": "קרובים",
    "home.tab.finishedShort": "הסתיימו",
    "home.schedule.empty": "אין משחקים להצגה.",
    "home.row.home": "בית",
    "home.row.away": "חוץ",
    "home.row.predicted": "ניחשתם",
    "home.row.predict": "לנחש",
    "home.row.locked": "ננעל",
    "home.row.later": "ייפתח בהמשך",
    "home.row.tbd": "טרם נקבע",
    "home.row.win": "נ",
    "home.row.loss": "ה",
    "home.leaders.title": "המובילים",
    "home.leaders.all": "לכל הטבלה",
    "home.whatsappGroup.title": "קבוצת הדיונים בוואטסאפ",
    "home.whatsappGroup.text": "מדברים על המשחק לפני, במהלך ואחרי",
    "home.footer.label": "קישורים",
    "home.installShort": "התקנת האפליקציה",
    "leaderboard.you": "אני",
    "leaderboard.tab.byGame": "לפי משחק",
    "leaderboard.tapHint": "לחצו על שם כדי לראות את הניחוש שלו",
    "leaguesHub.title": "ליגות ואתגרים",
    "leaguesHub.subtitle": "מתחרים רק מול החברים שלכם",
    "leaguesHub.mine": "הליגות שלי",
    "leaguesHub.signInText": "התחברו כדי ליצור ליגה פרטית ולהזמין חברים.",
    "leaguesHub.empty": "עדיין לא הצטרפתם לאף ליגה. צרו ליגה ושלחו לחברים את הקישור.",
    "leaguesHub.openTable": "לטבלת הליגה",
    "leaguesHub.competitions": "תחרויות מיוחדות",
    "tournament.tableTitle": "טבלת הטורניר",
    "prediction.progress": "שלב {n} מתוך {total}",
    "prediction.squadNote": "שחקני הסגל הרשמי למשחק מסומנים",
    "prediction.inSquad": "בסגל",
    "prediction.summary.title": "בדקו ושלחו",
    "prediction.aggregate.title": "כך ניחשו כולם",
    "prediction.aggregate.count": "{n} מנחשים",
    "prediction.aggregate.avgScoreLabel": "התוצאה הממוצעת",
    "prediction.aggregate.popularTitle": "הבחירות הפופולריות והממוצעים",
    "prediction.breakdown.totalLabel": 'סה"כ למשחק',
    "scoring.pointsUnit": "נק׳",
    "scoring.s1.r1.label": "תוצאה מדויקת (שני הצדדים)",
    "scoring.s1.r2.label": "הפרש מדויק וכיוון נכון",
    "scoring.s1.r2b.label": "הפרש של ±{range} וכיוון נכון",
    "scoring.s1.r3.label": "כיוון נכון בלבד (מי ינצח)",
    "scoring.s2.r1.label": "השחקן המוביל הנכון",
    "scoring.s2.r2.label": "פגיעה בול בכמות (בנוסף, אם השחקן נכון)",
    "scoring.s2.r3.label": "פגיעה בטווח ±{range} (בנוסף, אם השחקן נכון)",
    "scoring.s4.r1.label": "פגיעה בול בכמות",
    "scoring.s4.r2.label": "פגיעה בטווח ±{range}",
    "scoring.example.title": "דוגמה",
    "scoring.example.predicted": "ניחשתם",
    "scoring.example.actual": "בפועל",
    "scoring.example.text": "המנצחת נכונה, וההפרש שניחשתם רחוק ב-{diff} מההפרש האמיתי - {points} נקודות.",
    "about.photoAlt": "ניסים, היוצר של מנאחסים",
    "about.contactName": "ניסים",
    "home.hero.next": "המשחק הבא",
    "home.ticker.final": "סיום",
    "home.ticker.label": "משחקי העונה",
    "leaderboard.col.rank": "מקום",
    "leaderboard.col.player": "מנחש",
    "leaderboard.col.points": "נק׳",
    "home.strip.title": "העונה שלי",
    "prediction.required.score": "כדי להמשיך צריך לנחש את הנקודות של שתי הקבוצות",
    "prediction.required.amount": "כדי להמשיך צריך לבחור כמה {label}",
    "prediction.required.team": "כדי להמשיך צריך למלא את שלושת הנתונים",
    "prediction.amountFor": "כמה {label}?",
    "prediction.breakdown.yourSide": "הניחוש שלכם",
    "prediction.aggregate.avgShort": "בממוצע",
    "leaderboard.userPrediction.theirSide": "הניחוש",
    "prediction.result.final": "תוצאת סיום",
    "prediction.crowd.title": "כולם מול המציאות",
    "prediction.crowd.side": "ממוצע הניחושים",
    "home.row.myPoints": "נק' שלי",
    "home.hero.guest": "אורחת",
    "home.row.noPrediction": "לא ניחשת",
    "home.schedule.view.list": "רשימה",
    "home.schedule.view.calendar": "לוח שנה",
    "calendar.prev": "החודש הקודם",
    "calendar.next": "החודש הבא",
    "calendar.gamesInMonth": "{n} משחקים",
    "leaderboard.podium": "שלושת הראשונים",
    "home.schedule.showAll": "כל הלו״ז ({n} משחקים)",
    "home.schedule.showLess": "הצג פחות",
    "prediction.quickPick": "בחירה מהירה",
    "inAppBrowser.warning":
      'זיהינו שאתם גולשים מתוך אפליקציה אחרת (כמו WhatsApp) ולא מ-Safari/Chrome ישירות - ההתחברות עם Google עלולה להיכשל. פתחו את הקישור ישירות בדפדפן (לחיצה ארוכה על הקישור ← "פתח ב-Safari").',
  },
  en: {
    "common.back": "Schedule",
    "common.backBtn": "Back",
    "common.yes": "Yes",
    "common.no": "No",
    "common.countdown.locked": "Betting locked",
    "common.countdown.day": "day",
    "common.countdown.days": "days",
    "common.loading": "Loading...",
    "scoring.error": "Failed to load scoring rules.",

    "home.signIn": "Sign in with Google",
    "home.signOut": "Sign out",
    "home.install": "Install the app",
    "home.myScore": "My score",
    "home.about": "About us",
    "home.privacy": "Privacy policy",
    "home.tournamentBadge": "Special tournament",
    "home.tournamentTitle": "The VIP Tournament",
    "home.tournamentDescRules": "Next 6 games only - same scoring rules",
    "home.tournamentDesc": "Next 6 games only",
    "home.tournamentPrize":
      "Prize for the winner: a pair of VIP tickets vs. Hapoel Eilat",
    "home.tournamentBtn": "Tournament table",
    "home.schedule.title": "Season Schedule",
    "home.tab.upcoming": "Upcoming games ({n})",
    "home.tab.finished": "Finished games ({n})",
    "home.game.nextBadge": "Next game",
    "home.game.vs": "vs",
    "home.game.timeTBD": "Time TBD",
    "home.game.prizeBadge": "Prize game",
    "home.game.prizeLabel": "Prize: {prize}",
    "home.game.viewMyPrediction": "View your prediction",
    "home.game.viewAveragePrediction": "View average prediction",
    "home.game.viewPrediction": "View prediction",
    "home.game.predict": "Predict this game",
    "home.game.locked": "Betting locked",
    "home.game.opensAfterPrevious": "Opens after the previous game locks",
    "home.game.festivalDetails": "Festival details",
    "home.signInError": "Sign-in error: {msg}",
    "home.menu.leaderboard": "Leaderboard",
    "home.menu.scoringInfo": "How scoring works",
    "home.menu.timeKiller": "Kill some time",
    "home.menu.createLeague": "Create a league",
    "home.menu.leagueTable": "{name} league table",
    "home.menu.admin": "Enter result (admin)",
    "home.menu.myChallenges": "My Challenges",
    "home.whatsappGroup.label": "Join the discussion group on WhatsApp",
    "home.menu.sportsWorld": "Sports World",

    "sportsHub.home.title": "Sports World",
    "sportsHub.home.subtitle": "Choose a sport to see its leagues and teams",
    "sportsHub.comingSoon": "Coming soon",
    "sportsHub.leagues.title": "{sport} leagues",
    "sportsHub.leagues.none": "No leagues for this sport yet - coming soon!",
    "sportsHub.teams.title": "Choose a team",
    "sportsHub.teams.none": "No teams found for this league.",
    "sportsHub.teamPage.noGames": "No games found for this team yet.",

    "prediction.step.score": "Final score",
    "prediction.step.stats": "Personal questions",
    "prediction.step.team": "Team stats",
    "prediction.step.summary": "Summary",
    "prediction.category.scorer": "Top scorer",
    "prediction.category.scorer.amount": "points",
    "prediction.category.rebounder": "Top rebounder",
    "prediction.category.rebounder.amount": "rebounds",
    "prediction.category.assist": "Top assist man",
    "prediction.category.assist.amount": "assists",
    "prediction.loadingMyPrediction": "Loading your prediction…",
    "prediction.header.title": "Predict the game",
    "prediction.header.subtitle":
      "Hapoel Jerusalem vs {opponent} · {date}",
    "prediction.squadPanelTitle": "Tonight's official game squad",
    "prediction.scoreStep.question": "What will the final score be?",
    "prediction.carousel.prev": "Previous player",
    "prediction.carousel.next": "Next player",
    "prediction.loadingPlayers": "Loading players…",
    "prediction.statsStep.question": "Who will be {label}, and how much?",
    "prediction.nav.next": "Next: {label}",
    "prediction.nav.toSummary": "To summary",
    "prediction.teamStep.question": "How much will the team total?",
    "prediction.teamStep.threes": "Threes",
    "prediction.teamStep.rebounds": "Rebounds",
    "prediction.teamStep.assists": "Assists",
    "prediction.error.range": "Value must be between {min} and {max}",
    "prediction.error.fixToContinue": "Fix the highlighted values to continue",
    "prediction.summary.notSelected": "Not selected",
    "prediction.summary.foreignHeading":
      "Foreign players you predicted will play",
    "prediction.summary.noForeignSelected": "No foreign player selected",
    "prediction.summary.threes": "Team threes you predicted:",
    "prediction.summary.rebounds": "Team rebounds you predicted:",
    "prediction.summary.assists": "Team assists you predicted:",
    "prediction.breakdown.title":
      "What you predicted vs. what actually happened",
    "prediction.breakdown.teamThrees": "Team threes",
    "prediction.breakdown.teamRebounds": "Team rebounds",
    "prediction.breakdown.teamAssists": "Team assists",
    "prediction.breakdown.totalScore": "Total score for this game: {score}",
    "prediction.breakdown.header.category": "Category",
    "prediction.breakdown.header.predicted": "You predicted",
    "prediction.breakdown.header.actual": "Actual",
    "prediction.breakdown.header.points": "Points",
    "prediction.viewOnly.hasPrediction":
      "You already submitted a prediction for this game - here's what you predicted:",
    "prediction.viewOnly.noPrediction":
      "You didn't submit a prediction for this game - here's how everyone else predicted:",
    "prediction.viewOnly.edit": "Edit prediction",
    "prediction.viewOnly.backToSchedule": "Back to schedule",
    "prediction.connectingGoogle": "Signing in with Google…",
    "prediction.submitted.title": "Prediction submitted!",
    "prediction.submitted.message":
      "Good luck — come back after the game to see your score.",
    "prediction.error.title": "Something went wrong",
    "prediction.error.message": "Sign-in/submission failed. Please try again.",
    "prediction.summary.backToEdit": "Back: edit",
    "prediction.summary.submit": "Submit prediction",
    "prediction.aggregate.heading": "How everyone predicted ({n})",
    "prediction.aggregate.avgScore": "Average predicted score: {home} - {away}",
    "prediction.aggregate.avgThrees": "Average predicted threes: {v}",
    "prediction.aggregate.avgRebounds": "Average predicted rebounds: {v}",
    "prediction.aggregate.avgAssists": "Average predicted assists: {v}",
    "prediction.aggregate.mostPicked":
      "Most people picked {player} as {label}{avgSuffix}",
    "prediction.aggregate.avgSuffix": ", averaging {avg}",
    "prediction.aggregate.unknownPlayer": "a player",

    "leaderboard.title": "Leaderboard",
    "leaderboard.lastGameTitle": "Last game score",
    "leaderboard.loading": "Loading leaderboard…",
    "leaderboard.error": "Failed to load the leaderboard.",
    "leaderboard.empty":
      "No ranked results yet. Check back after the first game!",
    "leaderboard.overall": "Overall leaders",
    "leaderboard.selectPastGame": "Choose a game to view its ranking",
    "leaderboard.userPrediction.title": "{name}'s bet",
    "leaderboard.userPrediction.none": "This user didn't submit a prediction for this game.",
    "leaderboard.userPrediction.error": "Failed to load the prediction.",

    "tournament.title": "The VIP Tournament",
    "tournament.badge": "Special tournament",
    "tournament.desc":
      "Scoring counts only across these next 6 games, using the usual scoring rules",
    "tournament.prize": "Prize for the winner: {prize}",
    "tournament.loading": "Loading tournament table…",
    "tournament.error": "Failed to load the tournament table.",
    "tournament.empty":
      "No tournament results yet. Check back after the first of the six games!",

    "privacy.title": "Privacy Policy",
    "privacy.s1.title": "What data we collect",
    "privacy.s1.r1":
      "When signing in with Google: email address, display name, and profile photo.",
    "privacy.s1.r2": "The nickname you chose to show on the leaderboard.",
    "privacy.s1.r3":
      "The predictions/bets you submit, to calculate score and ranking.",
    "privacy.s1.r4":
      "In case of a technical error: the error message, device type and browser - for debugging purposes only.",
    "privacy.s2.title": "What we use the data for",
    "privacy.s2.r1":
      "Showing your name/nickname on the leaderboard and private leagues you've joined.",
    "privacy.s2.r2":
      "Calculating score and ranking against other participants.",
    "privacy.s2.r3": "Identifying and fixing technical issues in the app.",
    "privacy.s3.title": "Who the data is shared with",
    "privacy.s3.r1":
      "Data is stored with infrastructure providers (Google Firebase / Google Cloud) and is not passed to third parties for marketing purposes.",
    "privacy.s3.r2":
      "Your name/nickname and score are visible to other users of the app (leaderboard).",
    "privacy.s4.title": "Your rights",
    "privacy.s4.r1":
      'You may request at any time to delete your account and all personal data associated with it - see the "Delete account" button at the bottom of this page (for signed-in users).',
    "privacy.s4.r2":
      "For any other question or data-access request, feel free to contact us directly.",
    "privacy.delete.title": "Delete account",
    "privacy.delete.desc":
      "Clicking the button will permanently delete your account, predictions, and all your personal data. This action cannot be undone.",
    "privacy.delete.confirm":
      "Permanently delete your account and all your predictions/personal data? This action cannot be undone.",
    "privacy.delete.failed": "Account deletion failed, please try again later.",

    "about.title": "About us",
    "about.intro":
      'I’m excited to introduce "מנאחסים" – the new, exclusive game for Hapoel Jerusalem fans, where we predict (and also get crushed 😉) the team’s performance.',
    "about.highlightsTitle": "A few things about the game:",
    "about.nonProfitTitle": "Not for profit",
    "about.nonProfitText":
      "The game was built out of a wish to create something fun and enjoyable for our community.",
    "about.prizesTitle": "Prizes & sponsorships",
    "about.prizesText":
      "From time to time we'll give out prizes donated with love. If you have a business that wants to take part and donate a prize, feel free to reach out to me, and I'll gladly add a small shoutout for your business.",
    "about.feedback":
      "I'd love to hear your thoughts and what we could improve.",
    "about.closing": "Wishing us all good luck,",
    "about.cheer": "Let's go Hapoel! 🔴⚪",
    "about.contactAvailable": "Always available",

    "admin.title": "Enter real result",
    "admin.selectGame": "Select game",
    "admin.selectPlaceholder": "-- select --",
    "admin.gameOption": "vs {opponent} ({count} predictions)",
    "admin.countLine": "{count} predictions submitted for this game so far",
    "admin.statsQuestion": "Who actually led the team, and by how much?",
    "admin.player": "Player",
    "admin.teamStatsQuestion": "What did the team actually total?",
    "admin.bonusQuestionLabel": "Bonus question - {points} points",
    "admin.scoreQuestion": "Final score",
    "admin.home": "Home",
    "admin.away": "Away",
    "admin.saveButton": "Save result and grade predictions",
    "admin.saving": "Saving and grading…",
    "admin.saved": "Saved! Graded {count} predictions.",
    "admin.saveFailed": "Save failed. Please try again.",

    "nickname.title": "Welcome!",
    "nickname.subtitle": "Choose a nickname to show on the leaderboard",
    "nickname.placeholder": "e.g. Hapoel Captain",
    "nickname.errorLength": "Nickname must be 2-24 characters",
    "nickname.errorTaken": "That nickname is already taken, try another one",
    "nickname.errorGeneral": "Save failed, please try again",
    "nickname.save": "Save",

    "league.create.title": "Create a private league",
    "league.create.subtitle":
      "Give your league a name - friends who join will only compete against each other",
    "league.create.placeholder": "e.g. The Hapoel Crew",
    "league.create.errorLength": "League name must be 2-60 characters",
    "league.create.success": "League created! Send this link to your friends:",
    "league.create.copyLink": "Copy link",
    "league.create.copied": "Copied!",
    "league.create.createBtn": "Create league",
    "league.create.closeBtn": "Close",
    "league.create.error": "Failed to create the league, please try again",

    "league.join.title": "Join league",
    "league.join.invited": 'You\'ve been invited to join the league "{name}"',
    "league.join.joinBtn": "Join league",
    "league.join.cancelBtn": "Not now",
    "league.join.error": "Failed to join the league, please try again",

    "timeKiller.title": "Killing time on the way to the game",
    "timeKiller.intro": "A few good recommendations for the road:",
    "timeKiller.cta": "Listen on Spotify",

    "install.title": "Add shortcut",
    "install.prompt": "Want to add a home-screen shortcut for מנאחסים?",
    "install.yes": "Yes, add it",
    "install.never": "No thanks, don't ask again",
    "install.stepsIos":
      'Tap the share button ⬆️ at the bottom of the screen, then "Add to Home Screen".',
    "install.stepsOther":
      'Open your browser menu (⋮ or ⋯) and choose "Install app" or "Add to Home Screen".',
    "install.ok": "Got it",

    "scoring.s1.r1": "Exact score (both sides): {points} points",
    "scoring.s1.r2":
      "Exact margin (the score itself isn't exact but the gap and direction are correct): {points} points",
    "scoring.s1.r2b":
      "Margin within ±{range} and correct direction: {points} points",
    "scoring.s1.r3":
      "Correct direction only (you guessed who would win): {points} points",
    "scoring.s2.title": "Team leaders (scoring / rebounds / assists)",
    "scoring.s2.r1": "Picking the correct top player: {points} points",
    "scoring.s2.r2":
      "Exact amount hit (in addition, if the player was correct): {points} points",
    "scoring.s2.r3":
      "Within ±{range} range (in addition, if the player was correct): {points} points",
    "scoring.s3.title":
      'Tie-break between players (who actually counts as "the leader")',
    "scoring.s3.r1":
      "Scoring: if two players finish with the same points - the leader is determined by higher field goal %, and if still tied - whoever played fewer minutes.",
    "scoring.s3.r2":
      "Rebounds: if two players finish with the same rebounds - the leader is determined by who had more offensive rebounds, and if still tied - whoever played fewer minutes.",
    "scoring.s3.r3":
      "Assists: if two players finish with the same assists - the leader is determined by who had fewer turnovers, and if still tied - whoever played fewer minutes.",
    "scoring.s4.title": "Team stats (threes / rebounds / assists)",
    "scoring.s4.r1": "Exact amount hit: {points} points",
    "scoring.s4.r2": "Within ±{range} range: {points} points",
    "scoring.s5.title": "Tie-break",
    "scoring.s5.r1":
      "In case of a points tie between two or more fans - whoever submitted their prediction first ranks higher.",

    "challenge.rules.title": "Challenge a Friend",
    "challenge.rules.r1":
      "Friend Challenge is a separate bet from regular predictions: two fans bet 10 points directly against each other on a yes/no question about the game.",
    "challenge.rules.r2":
      "You can only create a challenge on the active game (the next one open for predictions) - write a question and pick what you think the answer will be.",
    "challenge.rules.r3":
      "You need at least 10 points in your account to create or join a challenge.",
    "challenge.rules.r4":
      "Once a friend joins via the link you shared, they automatically take the opposite side of the answer you picked - they don't need to choose their own answer.",
    "challenge.rules.r5":
      "You can only be involved (as creator or opponent) in one challenge per game at a time.",
    "challenge.rules.r6":
      "After the game, a winner is determined - the winner gets 10 points from the loser, added directly to the overall leaderboard score.",
    "challenge.rules.r7":
      "The goal of the game is to have fun, and we trust everyone to play fair - but to prevent unfair tricks, every question is checked, and if it turns out to be unreasonable the challenge will be cancelled with no points exchanged.",

    "challenge.gameBtn": "Challenge a friend",
    "challenge.modal.title": "Challenge a Friend",
    "challenge.modal.checkError":
      "Error checking challenge eligibility. Please try again.",
    "challenge.modal.alreadyInChallenge":
      "You already have an open challenge for this game.",
    "challenge.modal.notEnoughPoints":
      "You don't have enough points to create a challenge (you have {score}, {points} needed).",
    "challenge.modal.intro":
      "Write a yes/no question, pick what you think the answer will be, and bet 10 points against a friend",
    "challenge.modal.placeholder":
      "e.g. Will Nimrod Levy make a three-pointer?",
    "challenge.modal.errorLength": "The question must be 3-300 characters",
    "challenge.modal.created": "Challenge created! Send this link to a friend:",
    "challenge.modal.whatsappBtn": "Share on WhatsApp",
    "challenge.modal.createBtn": "Create challenge (10 points)",
    "challenge.modal.errorGeneric":
      "Failed to create the challenge, please try again",
    "challenge.modal.whatsappMessage":
      "🤝 I'm challenging you! {question}\nClick to join: {link}",

    "challenge.join.statusActive":
      "This challenge has already been taken by someone else.",
    "challenge.join.statusResolved": "This challenge has already ended.",
    "challenge.join.statusCancelled": "This challenge was cancelled.",
    "challenge.join.ownChallenge":
      "This is the challenge you created - share the link with a friend so they can join.",
    "challenge.join.challengerLine": "{name} is challenging you:",
    "challenge.join.creatorGuess": "{name}'s guess:",
    "challenge.join.yourSide":
      "You're betting on {answer} - {points} points on the line.",
    "challenge.join.joinBtn": "Join challenge",
    "challenge.join.notNow": "Not now",
    "challenge.join.errorGeneric":
      "Failed to join the challenge, please try again",

    "admin.linkStats.title": "Click stats",
    "admin.linkStats.empty": "No data yet.",
    "admin.linkStats.link": "Link",
    "admin.linkStats.source": "Source",
    "admin.linkStats.count": "Count",
    "admin.linkStats.last": "Last",
    "admin.challenges.title": "Friend challenges",
    "admin.challenges.empty": "No challenges yet.",
    "admin.challenges.game": "Game",
    "admin.challenges.statusPending": "Waiting for opponent",
    "admin.challenges.statusActive": "Active - awaiting a winner",
    "admin.challenges.statusResolved": "Resolved",
    "admin.challenges.statusCancelled": "Cancelled",
    "admin.challenges.noOpponent": "(no opponent yet)",
    "admin.challenges.winnerLabel": "Winner: {name}",
    "admin.challenges.won": "{name} won",
    "admin.challenges.cancelBtn": "Cancel challenge",
    "admin.challenges.cancelReasonPrompt":
      "Cancel this challenge? You can add a reason (optional), it will be shown to the participants:",
    "admin.challenges.cancellationReasonLabel": "Cancellation reason: {reason}",
    "admin.challenges.resolveError":
      "Failed to set the winner, please try again",
    "admin.challenges.cancelError":
      "Failed to cancel the challenge, please try again",
    "admin.challenges.notValidated": "Not checked yet",
    "admin.challenges.selectGamePrompt": "Select a game to see its challenges",
    "admin.challenges.gameOption":
      "{date} - vs {opponent} ({count} challenges)",
    "admin.challenges.showClosed": "Show closed too",
    "admin.challenges.resolveQuestion": "What was the actual answer?",
    "admin.challenges.noneForGame": "No challenges for this game.",
    "admin.challenges.resolveLocked":
      "You must enter the main game's result below first before resolving challenges.",

    "challenge.cancelNotice.title": "Your challenge was cancelled",
    "challenge.cancelNotice.questionLabel": "Question: {question}",
    "challenge.cancelNotice.reasonLabel": "Reason: {reason}",
    "challenge.cancelNotice.noReason": "No reason given.",

    "myChallenges.title": "My Challenges",
    "myChallenges.error": "Failed to load your challenges.",
    "myChallenges.empty": "You haven't created or joined any challenges yet.",
    "myChallenges.you": "(you)",
    "myChallenges.shareAgain": "Share again:",

    "scoring.prize.title": "Physical prize for select games",
    "scoring.prize.r1":
      "In some games, the winner (whoever scored the most points for that game) gets a unique physical prize, handed out at the next game played at the arena.",
    "scoring.prize.r2":
      "If the winner doesn't show up to that game - they lose the right to the prize.",
    "scoring.prize.r3":
      "Games that earn a prize are marked with a special logo next to the game in the schedule.",
    "scoring.sponsor.title": "Looking for a sponsor",
    "scoring.sponsor.text":
      "I'm currently looking for a sponsor for a cool prize to be given to the season's winner - if you're interested in sponsoring the prize, feel free to reach out to me: 0542538749",

    // ---- Redesign (2026-10): navigation, home, flow, shared components ----
    "common.decrease": "Decrease",
    "common.increase": "Increase",
    "nav.home": "Home",
    "nav.leaderboard": "Leaders",
    "nav.leagues": "Leagues",
    "nav.more": "More",
    "nav.label": "Main navigation",
    "nav.signIn": "Sign in",
    "nav.account": "My account",
    "nav.pointsShort": "pts",
    "nav.language": "Language",
    "lang.he": "עברית",
    "lang.en": "English",
    "home.hero.overline": "Next game · {competition}",
    "home.hero.lockIn": "until predictions lock",
    "home.hero.viewOrEdit": "View / edit your prediction",
    "home.hero.empty": "No upcoming games right now",
    "home.hero.emptyText": "The schedule updates as soon as the next game is set.",
    "home.countdown.days": "days",
    "home.countdown.hours": "hours",
    "home.countdown.minutes": "min",
    "home.strip.label": "My summary",
    "home.strip.score": "My points",
    "home.strip.rank": "My rank",
    "home.strip.leagues": "Leagues",
    "home.signInCard.title": "Sign in to play",
    "home.signInCard.text": "Your points, rank and leagues will show up here.",
    "home.tab.upcomingShort": "Upcoming",
    "home.tab.finishedShort": "Finished",
    "home.schedule.empty": "No games to show.",
    "home.row.home": "Home",
    "home.row.away": "Away",
    "home.row.predicted": "Predicted",
    "home.row.predict": "Predict",
    "home.row.locked": "Locked",
    "home.row.later": "Opens later",
    "home.row.tbd": "TBD",
    "home.row.win": "W",
    "home.row.loss": "L",
    "home.leaders.title": "Top predictors",
    "home.leaders.all": "Full table",
    "home.whatsappGroup.title": "WhatsApp discussion group",
    "home.whatsappGroup.text": "Talk about the game before, during and after",
    "home.footer.label": "Links",
    "home.installShort": "Install the app",
    "leaderboard.you": "You",
    "leaderboard.tab.byGame": "By game",
    "leaderboard.tapHint": "Tap a name to see their prediction",
    "leaguesHub.title": "Leagues & challenges",
    "leaguesHub.subtitle": "Compete only against your friends",
    "leaguesHub.mine": "My leagues",
    "leaguesHub.signInText": "Sign in to create a private league and invite friends.",
    "leaguesHub.empty": "You haven't joined a league yet. Create one and send your friends the link.",
    "leaguesHub.openTable": "League table",
    "leaguesHub.competitions": "Special competitions",
    "tournament.tableTitle": "Tournament table",
    "prediction.progress": "Step {n} of {total}",
    "prediction.squadNote": "Players in the official game squad are marked",
    "prediction.inSquad": "Squad",
    "prediction.summary.title": "Review and submit",
    "prediction.aggregate.title": "How everyone predicted",
    "prediction.aggregate.count": "{n} predictions",
    "prediction.aggregate.avgScoreLabel": "Average score",
    "prediction.aggregate.popularTitle": "Most-picked players and averages",
    "prediction.breakdown.totalLabel": "Game total",
    "scoring.pointsUnit": "pts",
    "scoring.s1.r1.label": "Exact final score (both sides)",
    "scoring.s1.r2.label": "Exact margin, right winner",
    "scoring.s1.r2b.label": "Margin within ±{range}, right winner",
    "scoring.s1.r3.label": "Right winner only",
    "scoring.s2.r1.label": "Picking the right leader",
    "scoring.s2.r2.label": "Exact amount (on top, if the player is right)",
    "scoring.s2.r3.label": "Within ±{range} (on top, if the player is right)",
    "scoring.s4.r1.label": "Exact amount",
    "scoring.s4.r2.label": "Within ±{range}",
    "scoring.example.title": "Example",
    "scoring.example.predicted": "You predicted",
    "scoring.example.actual": "Final",
    "scoring.example.text": "Right winner, and your margin was {diff} off the real one - {points} points.",
    "about.photoAlt": "Nisim, creator of Menahshim",
    "about.contactName": "Nisim",
    "home.hero.next": "Next game",
    "home.ticker.final": "Final",
    "home.ticker.label": "Season games",
    "leaderboard.col.rank": "Rank",
    "leaderboard.col.player": "Predictor",
    "leaderboard.col.points": "Pts",
    "home.strip.title": "My season",
    "prediction.required.score": "Enter both teams' points to continue",
    "prediction.required.amount": "Choose how many {label} to continue",
    "prediction.required.team": "Fill in all three numbers to continue",
    "prediction.amountFor": "How many {label}?",
    "prediction.breakdown.yourSide": "Your prediction",
    "prediction.aggregate.avgShort": "avg",
    "leaderboard.userPrediction.theirSide": "Prediction",
    "prediction.result.final": "Final",
    "prediction.crowd.title": "Everyone vs. what happened",
    "prediction.crowd.side": "Average prediction",
    "home.row.myPoints": "my pts",
    "home.hero.guest": "Away",
    "home.row.noPrediction": "No prediction",
    "home.schedule.view.list": "List",
    "home.schedule.view.calendar": "Calendar",
    "calendar.prev": "Previous month",
    "calendar.next": "Next month",
    "calendar.gamesInMonth": "{n} games",
    "leaderboard.podium": "Top three",
    "home.schedule.showAll": "Full schedule ({n} games)",
    "home.schedule.showLess": "Show less",
    "prediction.quickPick": "Quick pick",
    "inAppBrowser.warning":
      'Looks like you opened this inside another app (like WhatsApp) instead of Safari/Chrome - Google sign-in may fail. Open the link directly in your browser (long-press the link → "Open in Safari").',
  },
};

let currentLang: Lang = (localStorage.getItem(LANG_KEY) as Lang | null) ?? "he";

export function getLang(): Lang {
  return currentLang;
}

export function setLang(lang: Lang) {
  currentLang = lang;
  localStorage.setItem(LANG_KEY, lang);
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "he" ? "rtl" : "ltr";
  window.dispatchEvent(new CustomEvent("langchange"));
}

export function t(
  key: string,
  params?: Record<string, string | number>,
): string {
  let text = translations[currentLang][key] ?? translations.he[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }
  return text;
}

/** Looks up a known runtime (DB-sourced) Hebrew string - e.g. competition names,
 * player positions/citizenship - in DYNAMIC_TRANSLATIONS, or a small set of
 * regex patterns for competition round numbers. Falls back to the original
 * text untranslated if there's no known mapping (never throws/breaks). */
export function tDynamic(hebrewText: string): string {
  if (currentLang === "he") return hebrewText;
  if (DYNAMIC_TRANSLATIONS[hebrewText]) return DYNAMIC_TRANSLATIONS[hebrewText];
  for (const [pattern, replacement] of DYNAMIC_PATTERNS) {
    const match = hebrewText.match(pattern);
    if (match) return hebrewText.replace(pattern, replacement);
  }
  return hebrewText;
}

const DYNAMIC_PATTERNS: [RegExp, string][] = [
  [/^ליגת Winner סל, מחזור (\d+)$/, "Winner League, Round $1"],
  [/^גביע ווינר סל$/, "Winner Cup"],
];

const DYNAMIC_TRANSLATIONS: Dict = {
  // Player positions
  גארד: "Guard",
  פורוורד: "Forward",
  סנטר: "Center",
  רכז: "Point Guard",
  "פורוורד-סנטר": "Forward-Center",
  יורוקאפ: "EuroCup",
  // Citizenship
  ישראל: "Israel",
  'ארה"ב': "USA",
  'ארה"ב/ספרד': "USA/Spain",
  סרביה: "Serbia",
  "ישראל/שבדיה": "Israel/Sweden",
  // Player names (transliterated)
  "דבונטה קייקוק": "Devontae Cacok",
  "ג'ארד הארפר": "Jared Harper",
  "קנת' לופטון ג'וניור": "Kenneth Lofton Jr.",
  "ג'יילן סמית'": "Jalen Smith",
  "לורנזו בראון": "Lorenzo Brown",
  "שחר לוברבוים": "Shachar Luberbaum",
  "יותם חנוכי": "Yotam Hanochi",
  "שייק מילטון": "Shake Milton",
  "דושאן מילטיץ'": "Dusan Miletic",
  "רועי הובר": "Roi Huber",
  "נמרוד לוי": "Nimrod Levy",
  "דייויד רודי": "David Roddy",
  "גבריאל צאצאשוילי": "Gabriel Chachashvili",
  "איתן בורג": "Eitan Burg",
  "יובל זוסמן": "Yuval Zoosman",
  // Bonus questions (schedule.ts BONUS_QUESTIONS)
  "האם לורנזו בראון ישחק מעל 10 דקות?":
    "Will Lorenzo Brown play more than 10 minutes?",
  "האם רועי הובר יקלע לפחות שלשלה אחת?":
    "Will Roi Huber make at least one three-pointer?",
  "האם נקלע מעל 72% מהקו?":
    "Will the team shoot over 72% from the free-throw line?",
  "זוג כרטיסי VIP למשחק הפועל ירושלים מול הפועל אילת":
    "A pair of VIP tickets to the Hapoel Jerusalem vs. Hapoel Eilat game",
  "זוג כרטיסים לפסטיבל הקומדיה הישראלי":
    "A pair of tickets to the Israeli Comedy Festival",
};

/** Call once on app startup so <html lang/dir> matches whatever was persisted. */
export function initLang() {
  document.documentElement.lang = currentLang;
  document.documentElement.dir = currentLang === "he" ? "rtl" : "ltr";
}
