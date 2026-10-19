// مختصر الأذكار والآداب — عبد المحسن القاسم (Turath 576). Built by `node scripts/books/build-book.mjs qasim`,
// after hisn and baz. Only «قسم الأذكار» (chapters ٥–٤١) is taken: «الفضائل» and «قسم الآداب» hold no
// words to say. Each chapter quotes its hadith in full, vocalised; the words are picked out of it and
// matched against the pool by their letters. Where a reading differs only in spelling (قَدَّرَ/قَدَرُ،
// اؤجرني/أجرني) the entry points at the existing thiker (`ref`) rather than adding a near-copy.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CONTENT } from './lib.mjs';

const pages = JSON.parse(readFileSync(join(CONTENT, 'sources', 'turath', '576.json'), 'utf8'));
const text = Object.keys(pages).map(Number).sort((a, b) => a - b).filter((p) => p >= 14 && p <= 57)
  .map((p) => pages[p].text.split('\n_________\n')[0].replace(/<[^>]+>/g, '')).join('\n');
const toNum = (s) => Number(s.replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
/** The text of chapter [n], footnotes left out. */
const chapters = {};
for (const part of text.split(/\n?(?=\[[٠-٩]+\]\n)/)) {
  const m = part.match(/^\[([٠-٩]+)\]\n([^\n]+)\n([\s\S]*)$/);
  if (m) chapters[toNum(m[1])] = { title: m[2].trim(), body: m[3] };
}
const ch = (n) => chapters[n].body;

/** One chapter: its own title and sections, entries reading from its text. */
const chapter = (n, sections, entries) => ({ title: chapters[n].title.replace(/[ً-ٟ]/g, ''), sections, entries: entries.map((e) => ({ raw: ch(n), hid: e.hid ?? String(n), ...e })) });

export default {
  title: 'مختصر الأذكار والآداب',
  author: 'عبد المحسن القاسم',
  source: { turath: 576 },
  text,
  chapters: [
    chapter(5, ['toilet'], [
      { id: 'audhu-min-al-khubuthi', title: 'اللهم إني أعوذ بك من الخبث والخبائث', pick: ['اللهم اني اعوذ بك من الخبث', 'والخبائث'], note: 'إذا أراد دخول الخلاء',
        source: 'متفق عليه', hadithPick: ['كان النبي', 'والخبائث'] },
    ]),
    chapter(6, ['toilet'], [{ ref: 'ghufranak', note: 'إذا خرج من الخلاء', source: 'رواه أحمد', hadithPick: ['كان النبي', 'غفرانك'] }]),
    chapter(7, ['wudu'], [
      { id: 'wudu-abdullahi-wa-rasuluh', title: 'أشهد ألا إله إلا الله وأن محمدًا عبد الله ورسوله', pick: ['اشهد الا اله الا الله', 'ورسوله'],
        fadl: 'فُتحت له أبواب الجنة الثمانية، يدخل من أيها شاء', source: 'رواه مسلم', hadithPick: ['ما منكم', 'من أيها شاء'] },
    ]),
    chapter(8, ['adhan'], [{ guide: 'إذا سمعتم المؤذن فقولوا مثل ما يقول، ثم صلّوا عليّ', source: 'رواه مسلم' }]),
    chapter(9, ['mosque'], [
      { ref: 'iftah-li-abwab-rahmatik', note: 'إذا دخل المسجد', source: 'رواه مسلم', hadithPick: ['اذا دخل', 'من فضلك'] },
      { ref: 'asaluka-min-fadlik', note: 'إذا خرج من المسجد', hadith: 'qasim-9' },
    ]),
    chapter(10, ['prayer'], [{ ref: 'istiftah-subhanak', note: 'إذا استفتح الصلاة', source: 'رواه أبو داود' }]),
    chapter(11, ['prayer'], [{ ref: 'subhana-rabbiyal-azim', note: 'في الركوع', source: 'رواه مسلم' }]),
    chapter(12, ['prayer'], [
      { ref: 'samiallahu-liman-hamidah', note: 'إذا رفع رأسه من الركوع', source: 'رواه البخاري', hadithPick: ['رفع النبي', 'يكتبها اول'] },
      { ref: 'rabbana-wa-lakal-hamd', hadith: 'qasim-12', fadl: 'رأى النبي ﷺ بضعة وثلاثين ملكًا يبتدرونها أيهم يكتبها أول' },
    ]),
    chapter(13, ['prayer'], [{ ref: 'subhana-rabbiyal-ala', note: 'في السجود', source: 'رواه مسلم' }]),
    chapter(14, ['prayer', 'salat-nabi'], [
      { ref: 'at-tahiyyat', only: 'prayer', source: 'متفق عليه' },
      { ref: 'as-salat-al-ibrahimiyya', hid: '14-2', source: 'رواه البخاري' },
    ]),
    chapter(15, ['prayer'], [
      { id: 'audhu-min-arba', title: 'اللهم إني أعوذ بك من عذاب جهنم ومن عذاب القبر', pick: ['اللهم اني اعوذ بك من عذاب جهنم', 'الدجال'],
        note: 'إذا تشهد قبل أن يسلّم', source: 'رواه مسلم' },
    ]),
    chapter(16, ['post-prayer'], [
      { ref: 'astaghfirullah', num: 3, source: 'رواه مسلم', hadithPick: ['كان النبي', 'والاكرام'] },
      { ref: 'anta-as-salam', hadith: 'qasim-16' },
      { ref: 'subhanallah', num: 33, hid: '16-2', source: 'رواه مسلم', hadithPick: ['من سبح الله', 'زبد البحر'], fadl: 'غُفرت خطاياه وإن كانت مثل زبد البحر' },
      { ref: 'alhamdulillah', num: 33, hadith: 'qasim-16-2' },
      { ref: 'allahu-akbar', num: 33, hadith: 'qasim-16-2' },
      { ref: 'tahleel', note: 'تمام المائة', hadith: 'qasim-16-2' },
      { ref: 'ayat-al-kursi', hid: '16-3', source: 'رواه النسائي في السنن الكبرى', grade: 'صحيح', hadithPick: ['من قرا ايه الكرسي', 'ان يموت'],
        fadl: 'لم يمنعه من دخول الجنة إلا أن يموت' },
      { ref: 'al-ikhlas', hid: '16-4', source: 'رواه أحمد', hadithPick: ['امرني رسول الله', 'كل صلاه'], note: 'دبر كل صلاة' },
      { ref: 'al-falaq', hadith: 'qasim-16-4' },
      { ref: 'an-nas', hadith: 'qasim-16-4' },
    ]),
    chapter(17, ['ruqyah'], [
      { ref: 'al-ikhlas', note: 'إذا اشتكى يقرأ على نفسه بالمعوذات وينفث', source: 'متفق عليه', hadithPick: ['كان النبي', 'وينفث'] },
      { ref: 'al-falaq', hadith: 'qasim-17' },
      { ref: 'an-nas', hadith: 'qasim-17' },
    ]),
    chapter(18, ['sick'], [{ ref: 'la-bas-tahur', note: 'إذا دخل على مريض يعوده', source: 'رواه البخاري' }]),
    chapter(19, ['calamity', 'distress'], [
      { ref: 'qaddarallah', only: 'distress', note: 'وإن أصابك شيء فلا تقل: لو أني فعلت كان كذا وكذا، ولكن قل', source: 'رواه مسلم', hadithPick: ['وان اصابك', 'عمل الشيطان'] },
      { ref: 'inna-lillah-ujurni', only: 'calamity', hid: '19-2', source: 'رواه مسلم', hadithPick: ['ما من عبد', 'خيرا منها'], fadl: 'إلا أجره الله في مصيبته، وأخلف له خيرًا منها' },
    ]),
    chapter(20, ['travel'], [{ ref: 'astawdiu-allaha-dinak', note: 'إذا ودّع أحدًا', source: 'رواه أحمد' }]),
    chapter(21, ['travel'], [
      { ref: 'duaa-as-safar', note: 'إذا استوى على بعيره خارجًا إلى سفر كبّر ثلاثًا ثم قال', source: 'رواه مسلم' },
      { ref: 'ayibun-taibun', note: 'وإذا رجع قالهن وزاد فيهن', hadith: 'qasim-21' },
    ]),
    chapter(22, ['home'], [{ guide: 'يذكر الله عند دخوله بيته وعند طعامه؛ فإن الشيطان يقول: لا مبيت لكم ولا عشاء', source: 'رواه مسلم', hadithPick: ['اذا دخل الرجل', 'ولا عشاء'] }]),
    chapter(23, ['clothes'], [
      { id: 'kasawtanihi-khayrahu', title: 'اللهم لك الحمد أنت كسوتنيه، أسألك خيره', pick: ['اللهم لك الحمد', 'ما صنع له وأعوذ بك من شره وشر ما صنع له'],
        note: 'إذا استجدّ ثوبًا سمّاه باسمه — عمامة أو قميصًا أو رداء — ثم يقول', source: 'رواه الترمذي' },
    ]),
    chapter(24, ['food'], [
      { ref: 'bismillah', note: 'قبل الطعام', source: 'رواه الترمذي', hadithPick: ['اذا اكل', 'واخره'] },
      { ref: 'bismillah-awwalahu-wa-akhirah', note: 'إن نسي في أوله', hadith: 'qasim-24' },
    ]),
    chapter(25, ['food'], [
      { id: 'alhamdulillahi-kathiran-tayyiban', title: 'الحمد لله كثيرًا طيبًا مباركًا فيه', pick: ['الحمد لله كثيرا', 'ربنا'], note: 'إذا رفع مائدته', source: 'رواه البخاري' },
    ]),
    chapter(26, ['food', 'for-others'], [{ ref: 'barik-lahum-fima-razaqtahum', note: 'إذا أكل عند أحد', source: 'رواه مسلم' }]),
    chapter(27, ['sleep'], [{ ref: 'baqarah-ending', source: 'متفق عليه', fadl: 'من قرأهما في ليلة كفتاه' }]),
    chapter(28, ['sleep'], [
      { ref: 'ayat-al-kursi', source: 'رواه البخاري', fadl: 'لن يزال عليك من الله حافظ، ولا يقربك شيطان حتى تصبح', hadithPick: ['اذا اويت', 'حتى تصبح'] },
      { ref: 'al-ikhlas', num: 3, hid: '28-2', source: 'رواه البخاري', note: 'يجمع كفيه ثم ينفث فيهما فيقرأ فيهن، ثم يمسح بهما ما استطاع من جسده، يبدأ برأسه ووجهه، يفعل ذلك ثلاث مرات' },
      { ref: 'al-falaq', num: 3, hadith: 'qasim-28-2' },
      { ref: 'an-nas', num: 3, hadith: 'qasim-28-2' },
      { ref: 'bismika-amutu', hid: '28-3', source: 'رواه البخاري' },
    ]),
    chapter(29, ['waking'], [{ ref: 'hamd-ahyana', source: 'متفق عليه' }]),
    chapter(30, ['morning', 'evening'], [
      { ref: 'al-ikhlas', num: 3, source: 'رواه الترمذي', fadl: 'تكفيك من كل شيء', hadithPick: ['قل قل هو الله', 'من كل شيء'] },
      { ref: 'al-falaq', num: 3, hadith: 'qasim-30' },
      { ref: 'an-nas', num: 3, hadith: 'qasim-30' },
      { ref: 'kalimat-allah', num: 3, only: 'evening', hid: '30-2', source: 'رواه أحمد', fadl: 'لم تضرّه حُمَة تلك الليلة', hadithPick: ['من قال اذا امسى', 'تلك الليله'] },
      { ref: 'bismillah-la-yadurr', num: 3, hid: '30-3', source: 'رواه الترمذي', fadl: 'لم يضره شيء', hadithPick: ['ما من عبد يقول', 'فيضره شيء'] },
      { ref: 'sayyid-al-istighfar-alt', hid: '30-4', source: 'رواه البخاري', hadithPick: ['سيد الاستغفار', 'قبل ان يصبح فهو من اهل الجنه'],
        fadl: 'من قالها من النهار موقنًا بها فمات من يومه قبل أن يمسي فهو من أهل الجنة، ومن قالها من الليل وهو موقن بها فمات قبل أن يصبح فهو من أهل الجنة' },
    ]),
    chapter(31, ['tasbih'], [
      { ref: 'subhanallah-wa-bihamdih', num: 100, source: 'متفق عليه', fadl: 'حُطّت خطاياه وإن كانت مثل زبد البحر' },
      { ref: 'subhanallah-al-azim', hid: '31-2', source: 'متفق عليه', fadl: 'كلمتان خفيفتان على اللسان، ثقيلتان في الميزان، حبيبتان إلى الرحمن' },
    ]),
    chapter(32, ['tasbih'], [
      { ref: 'tahleel', num: 100, source: 'متفق عليه', hadithPick: ['من قال', 'اكثر من ذلك'],
        fadl: 'كانت له عدل عشر رقاب، وكُتبت له مائة حسنة، ومُحيت عنه مائة سيئة، وكانت له حرزًا من الشيطان يومه ذلك حتى يمسي' },
    ]),
    chapter(33, ['tasbih'], [{ ref: 'hawqala', source: 'متفق عليه', fadl: 'كنز من كنوز الجنة' }]),
    chapter(34, ['istighfar'], [{ ref: 'astaghfirullah', num: 100, note: 'في اليوم', source: 'رواه مسلم', hadithPick: ['اني لاستغفر', 'مئه مره'] }]),
    chapter(35, ['weather'], [{ ref: 'sayyiban-nafian', note: 'إذا رأى المطر', source: 'رواه البخاري' }]),
    chapter(36, ['travel'], [{ ref: 'kalimat-allah', note: 'إذا نزل منزلًا', source: 'رواه مسلم', fadl: 'لم يضره شيء حتى يرتحل من منزله ذلك' }]),
    chapter(37, ['joy'], [
      { ref: 'subhanallah', note: 'عند التعجب من شيء', source: 'متفق عليه' },
      { ref: 'allahu-akbar', note: 'عند التعجب من شيء', hid: '37-2', source: 'متفق عليه' },
    ]),
    chapter(38, ['sneeze'], [
      { ref: 'alhamdulillah', note: 'يقوله العاطس', source: 'رواه البخاري', hadithPick: ['اذا عطس', 'بالكم'] },
      { ref: 'yarhamukallah', note: 'يقوله له أخوه أو صاحبه', hadith: 'qasim-38' },
      { ref: 'yahdikumullah', note: 'ويردّ العاطس', hadith: 'qasim-38' },
    ]),
    chapter(39, ['anger'], [{ ref: 'taawwudh', source: 'متفق عليه', fadl: 'لو قالها لذهب عنه ما يجد', hadithPick: ['استب رجلان', 'الرجيم'] }]),
    chapter(40, ['for-others'], [{ ref: 'jazakallahu-khayran', note: 'لمن صنع إليك معروفًا', source: 'رواه الترمذي', fadl: 'فقد أبلغ في الثناء' }]),
    chapter(41, ['majlis'], [
      { ref: 'subhanaka-allahumma-wa-bihamdik', note: 'قبل أن يقوم من مجلسه', source: 'رواه الترمذي', fadl: 'غُفر له ما كان في مجلسه ذلك', hadithPick: ['من جلس', 'مجلسه ذلك'] },
    ]),
  ],
};
