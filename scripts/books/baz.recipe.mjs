// تحفة الأخيار ببيان جملة نافعة مما ورد في الكتاب والسنة من الأدعية والأذكار — ابن باز (Turath 31303).
// Built by `node scripts/books/build-book.mjs baz`, after hisn (it reuses حصن المسلم's hadiths and vocalised text).
//
// The Turath text of this book has no harakat, so every thiker is matched by its letters against the
// pool (`ref`), and where Ibn Baz's wording differs the variant is built from a vocalised pool text
// (`derive`) — nothing is retyped. Where both books cite the same narration the entry shares
// حصن المسلم's hadith; Ibn Baz's own quotation of it is kept in `hadithPick`.
//
// Left out: the closing chapter on النصيحة (no athkar), and the salam chapter's hadiths that are about
// manners rather than words to say, except those kept as guidance.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CONTENT } from './lib.mjs';

const pages = JSON.parse(readFileSync(join(CONTENT, 'sources', 'turath', '31303.json'), 'utf8'));
// Quotations come from the chapters only (from page 16); the introduction quotes some of the same hadiths.
const text = Object.keys(pages).map(Number).sort((a, b) => a - b).filter((p) => p >= 16).map((p) => pages[p].text.replace(/<[^>]+>/g, '')).join('\n');

export default {
  title: 'تحفة الأخيار',
  author: 'ابن باز',
  source: { turath: 31303 },
  text,
  chapters: [
    { title: 'الأذكار المشروعة بعد السلام في الصلوات الخمس', sections: ['post-prayer'], entries: [
      { ref: 'astaghfirullah', num: 3, hadith: 'hisn-66', hadithPick: ['أنه كان إذا سلم من صلاة الفريضة', 'بعد كل صلاة'] },
      { ref: 'anta-as-salam', hadith: 'hisn-66' },
      { ref: 'la-mania-lima-atayt', hadith: 'hisn-67' },
      { ref: 'la-nabudu-illa-iyyah', hadith: 'hisn-68' },
      { ref: 'subhanallah', num: 33, hadith: 'hisn-69' },
      { ref: 'alhamdulillah', num: 33, hadith: 'hisn-69' },
      { ref: 'allahu-akbar', num: 33, hadith: 'hisn-69' },
      { ref: 'tahleel', note: 'تمام المائة', hadith: 'hisn-69' },
      { ref: 'ayat-al-kursi', hadith: 'hisn-71' },
      { ref: 'al-ikhlas', hadith: 'hisn-70', note: 'بعد كل صلاة، ويستحب تكرار السور الثلاث ثلاث مرات بعد صلاة الفجر وصلاة المغرب' },
      { ref: 'al-falaq', hadith: 'hisn-70' },
      { ref: 'an-nas', hadith: 'hisn-70' },
      { ref: 'tahleel-yuhyi-wa-yumit', num: 10, note: 'بعد صلاة الفجر وصلاة المغرب', hadith: 'hisn-72' },
    ] },
    { title: 'أذكار الصباح والمساء', sections: ['morning', 'evening'], entries: [
      { ref: 'subhanallah-wa-bihamdih', num: 100, hadith: 'hisn-91' },
      { ref: 'asbahna-almulk-long', only: 'morning', hadith: 'hisn-77' },
      { ref: 'amsayna-almulk-long', only: 'evening', hadith: 'hisn-77' },
      { ref: 'sayyid-al-istighfar-alt', hadith: 'hisn-79' },
      { ref: 'al-ikhlas', num: 3, hadith: 'hisn-76' },
      { ref: 'al-falaq', num: 3, hadith: 'hisn-76' },
      { ref: 'an-nas', num: 3, hadith: 'hisn-76' },
      { ref: 'bika-asbahna', only: 'morning', hadith: 'hisn-78' },
      { ref: 'bika-amsayna', only: 'evening', hadith: 'hisn-78' },
      { ref: 'fatir-as-samawat', hadith: 'hisn-85', note: 'وإذا أخذ مضجعه' },
      { ref: 'bismillah-la-yadurr', num: 3, hadith: 'hisn-86' },
      { ref: 'raditu-billah', num: 3, hadith: 'hisn-87' },
      { ref: 'asbahtu-ushhiduk', num: 4, only: 'morning', hadith: 'hisn-80' },
      { id: 'amsaytu-ushhiduk-bianna', title: 'اللهم إني أمسيت أشهدك', only: 'evening', num: 4, hadith: 'hisn-80',
        derive: { from: 'asbahtu-ushhiduk', replace: [['اصبحت', 'أمسيتُ']] } },
      { ref: 'ma-asbaha-bi', only: 'morning', hadith: 'hisn-81' },
      { ref: 'ma-amsa-bi-aw-biahad', only: 'evening', hadith: 'hisn-81' },
      { ref: 'afiyah-alt', hadith: 'hisn-84' },
      { ref: 'tahleel', num: 10, hid: 'tahleel-10', source: 'رواه الإمام أحمد في مسنده بإسناد حسن',
        hadithPick: ['من قال: لا إله إلا الله وحده', 'كان له مثل ذلك'],
        fadl: 'كتب الله له مائة حسنة، ومحا عنه مائة سيئة، وكانت له عدل رقبة، وحفظ بها يومئذ حتى يمسي' },
      { ref: 'kalimat-allah', num: 3, only: 'evening', hadith: 'hisn-97' },
      { ref: 'asbahna-ala-fitrah', only: 'morning', hadith: 'hisn-90' },
      { ref: 'amsayna-ala-fitrah', only: 'evening', hadith: 'hisn-90' },
      { ref: 'afini-fi-badani', num: 3, hadith: 'hisn-82' },
      { ref: 'kufr-wal-faqr-wa-audhu', num: 3, hadith: 'hisn-82' },
      { ref: 'tahleel', num: 100, only: 'morning', hadith: 'hisn-93', note: 'في صباح كل يوم' },
    ] },
    { title: 'ما يقال عند دخول المنزل', sections: ['home'], entries: [
      { guide: 'يذكر الله تعالى عند دخوله وعند طعامه؛ فإن الشيطان يقول: لا مبيت لكم ولا عشاء', hid: 'home-dhikr', source: 'رواه مسلم',
        hadithPick: ['إذا دخل الرجل بيته', 'المبيت والعشاء'] },
      { id: 'khayr-al-mawlij', title: 'اللهم إني أسألك خير المولج وخير المخرج', note: 'إذا ولج الرجل بيته، ثم ليسلّم على أهله',
        text: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ خَيْرَ الْمَوْلِجِ، وَخَيْرَ الْمَخْرَجِ، بِسْمِ اللَّهِ وَلَجْنَا، وَبِسْمِ اللَّهِ خَرَجْنَا، وَعَلَى اللَّهِ رَبِّنَا تَوَكَّلْنَا',
        hid: 'mawlij', source: 'خرّجه أبو داود بإسناد حسن', hadithPick: ['إذا ولج الرجل بيته', 'ثم ليسلم على أهله'] },
    ] },
    { title: 'ما يقال عند الخروج من المنزل إلى المسجد أو غيره', sections: ['home'], entries: [
      { ref: 'khuruj-bismillah-tawakkaltu', hadith: 'hisn-16' },
      { ref: 'audhu-an-adilla', hadith: 'hisn-17', note: 'كان ﷺ إذا خرج من بيته رفع طرفه إلى السماء وقال' },
    ] },
    { title: 'ما يشرع عند دخول المسجد والخروج منه', sections: ['mosque'], entries: [
      { id: 'iftah-li-abwab-rahmatik', title: 'اللهم افتح لي أبواب رحمتك', text: 'اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ',
        note: 'إذا دخل المسجد سلّم على النبي ﷺ وقال', hid: 'masjid-1', source: 'رواه مسلم وأبو داود، واللفظ لأبي داود',
        hadithPick: ['إذا دخل أحدكم المسجد فليسلم', 'من فضلك'] },
      { id: 'audhu-billahil-azim', title: 'أعوذ بالله العظيم وبوجهه الكريم', note: 'إذا دخل المسجد',
        derive: { from: 'dukhul-al-masjid', replace: [['الرجيم، بسم الله، والصلاة، والسلام على رسول الله، اللهم افتح لي ابواب رحمتك', 'الرَّجِيمِ']] },
        hid: 'masjid-2', source: 'خرّجه أبو داود بإسناد حسن', hadithPick: ['أنه كان إذا دخل المسجد قال', 'سائر اليوم'] },
      { id: 'asaluka-min-fadlik', title: 'اللهم إني أسألك من فضلك', text: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ مِنْ فَضْلِكَ', note: 'إذا خرج من المسجد', hadith: 'baz-masjid-1' },
      { id: 'isimni-min-ash-shaytan', title: 'اللهم اعصمني من الشيطان الرجيم', text: 'اللَّهُمَّ اعْصِمْنِي مِنَ الشَّيْطَانِ الرَّجِيمِ',
        note: 'إذا خرج من المسجد سلّم على النبي ﷺ وقال', hid: 'masjid-3', source: 'أخرجه ابن ماجه بإسناد صحيح',
        hadithPick: ['اللهم افتح لي ابواب رحمتك واذا خرج فليسلم', 'الرجيم'] },
    ] },
    { title: 'ما يشرع من الذكر والدعاء عند النوم واليقظة', sections: ['sleep', 'waking'], entries: [
      { ref: 'bismika-amutu', only: 'sleep', note: 'إذا أخذ مضجعه من الليل وضع يده تحت خده', hadith: 'hisn-105' },
      { ref: 'hamd-ahyana', only: 'waking', hadith: 'hisn-1' },
      { ref: 'al-ikhlas', only: 'sleep', num: 3, hadith: 'hisn-99',
        note: 'كان ﷺ إذا أوى إلى فراشه جمع كفيه ثم نفث فيهما فقرأ المعوذات، ثم يمسح بهما ما استطاع من جسده، يبدأ برأسه ووجهه، يفعل ذلك ثلاث مرات' },
      { ref: 'al-falaq', only: 'sleep', num: 3, hadith: 'hisn-99' },
      { ref: 'an-nas', only: 'sleep', num: 3, hadith: 'hisn-99' },
      { ref: 'ayat-al-kursi', only: 'sleep', hadith: 'hisn-100' },
      { ref: 'baqarah-ending', only: 'sleep', hadith: 'hisn-101' },
      { id: 'aslamtu-nafsi-wajjahtu', title: 'اللهم أسلمت نفسي إليك', only: 'sleep', hadith: 'hisn-111',
        note: 'يتوضأ وضوءه للصلاة، ثم يضطجع على شقه الأيمن، ويجعلهن آخر ما يقول',
        derive: { from: 'aslamtu-nafsi', replace: [['وفوضت امري اليك ووجهت وجهي اليك', 'وَوَجَّهْتُ وَجْهِي إِلَيْكَ، وَفَوَّضْتُ أَمْرِي إِلَيْكَ'], ['وبنبيك', 'وَنَبِيِّكَ']] } },
      { id: 'rabb-as-samawat-wa-rabb-al-ard', title: 'اللهم رب السماوات ورب الأرض ورب العرش العظيم', only: 'sleep', hadith: 'hisn-107',
        derive: { from: 'rabb-as-samawat-as-sab', replace: [['السموات السبع', 'السَّمَوَاتِ']] } },
      { ref: 'qini-adhabak', only: 'sleep', num: 3, note: 'يضع يده اليمنى تحت خده الأيمن', hadith: 'hisn-104' },
      { ref: 'atamana-wa-saqana', only: 'sleep', hadith: 'hisn-108' },
      { id: 'khalaqta-nafsi-tatawaffaha', title: 'اللهم خلقت نفسي وأنت تتوفاها', only: 'sleep', hadith: 'hisn-103',
        derive: { from: 'khalaqta-nafsi', replace: [['اللهم انك خلقت', 'اللَّهُمَّ خَلَقْتَ'], ['توفاها', 'تَتَوَفَّاهَا']] } },
      { id: 'subhanaka-rabbi-bika-wadatu', title: 'سبحانك اللهم ربي بك وضعت جنبي', only: 'sleep', hadith: 'hisn-102',
        note: 'إذا أوى إلى فراشه نفضه بداخلة إزاره وسمّى الله، ثم اضطجع على شقه الأيمن وقال',
        derive: { from: 'bismika-rabbi-wadatu', replace: [['باسمك ربي وضعت', 'سُبْحَانَكَ اللَّهُمَّ رَبِّي بِكَ وَضَعْتُ'], ['فان امسكت', 'إِنْ أَمْسَكْتَ']] } },
      { ref: 'subhanallah', only: 'sleep', num: 33, hadith: 'hisn-106' },
      { ref: 'alhamdulillah', only: 'sleep', num: 33, hadith: 'hisn-106' },
      { ref: 'allahu-akbar', only: 'sleep', num: 34, hadith: 'hisn-106' },
      { id: 'man-taarra', title: 'من تعارّ من الليل', only: 'waking', note: 'إذا استيقظ من الليل', hadith: 'hisn-2',
        derive: { from: 'taarr-min-allayl', replace: [['سبحان الله والحمد لله', 'الْحَمْدُ لِلَّهِ، وَسُبْحَانَ اللَّهِ'], ['بالله العلي العظيم رب اغفر لي', 'بِاللَّهِ، اللَّهُمَّ اغْفِرْ لِي']] } },
    ] },
    { title: 'الأذكار والأدعية المشروعة في ابتداء الشراب والأكل والفراغ منهما', sections: ['food'], entries: [
      { ref: 'bismillah', note: 'قبل الطعام', hid: 'sammi-allah', source: 'متفق عليه', hadithPick: ['يا غلام', 'مما يليك'] },
      { id: 'bismillah-awwalahu-wa-akhirahu', title: 'بسم الله أوله وآخره', text: 'بِسْمِ اللَّهِ أَوَّلَهُ وَآخِرَهُ', note: 'إن نسي أن يذكر الله في أوله',
        hid: 'awwalahu', source: 'رواه أبو داود والنسائي والترمذي وقال: حسن صحيح، وصححه الحاكم وأقره الذهبي', grade: 'صحيح', gradeNote: 'صححه الحاكم',
        hadithPick: ['إذا أكل أحدكم فليذكر', 'أوله وآخره'] },
      { guide: 'إن الله ليرضى عن العبد أن يأكل الأكلة فيحمده عليها، أو يشرب الشربة فيحمده عليها', hid: 'yarda', source: 'رواه مسلم' },
      { ref: 'atamani-hadha', hadith: 'hisn-180', fadl: 'غفر له ما تقدم من ذنبه' },
      { ref: 'hamdan-kathiran-tayyiban', hadith: 'hisn-181', note: 'إذا فرغ من طعامه' },
    ] },
    { title: 'ما يشرع من الذكر والدعاء عند رؤية البلدة أو القفول منها', sections: ['travel'], entries: [
      { ref: 'duaa-al-qaryah', note: 'إذا رأى قرية يريد دخولها', hadith: 'hisn-208' },
      { ref: 'ayibun-taibun', note: 'إذا أقبل على بلده، يقولها حتى يدخلها', hid: 'ayibun', source: 'رواه مسلم',
        hadithPick: ['أقبلنا مع النبي', 'حتى قدمنا المدينة'] },
    ] },
    { title: 'ما يشرع من الذكر والدعاء عند الأذان وبعده', sections: ['adhan'], entries: [
      { guide: 'إذا سمعتم النداء فقولوا مثل ما يقول المؤذن', hid: 'nida', source: 'متفق عليه' },
      { ref: 'hawqala', note: 'عند «حيّ على الصلاة» و«حيّ على الفلاح»، ويقول مثل ما يقول المؤذن فيما سواهما', hid: 'umar-adhan', source: 'رواه مسلم',
        hadithPick: ['إذا قال المؤذن الله أكبر', 'دخل الجنة'] },
      { id: 'adhan-ashhadu', title: 'أشهد أن لا إله إلا الله… رضيت بالله ربًّا', note: 'حين يسمع المؤذن', hadith: 'hisn-23',
        derive: { from: 'adhan-wa-ana-ashhad', replace: [['وانا اشهد', 'أَشْهَدُ']] } },
      { guide: 'ثم صلّوا على النبي ﷺ؛ فإنه من صلّى عليه صلاة صلى الله عليه بها عشرًا، ثم سلوا الله له الوسيلة', hid: 'wasila', source: 'رواه مسلم في صحيحه',
        hadithPick: ['إذا سمعتم المؤذن فقولوا', 'حلت له الشفاعة'] },
      { ref: 'adhan-al-wasila', hadith: 'hisn-25', fadl: 'حلّت له شفاعتي يوم القيامة' },
    ] },
    { title: 'مشروعية السلام بدءًا وإجابة، وتشميت العاطس إذا حمد الله، وعيادة المريض', sections: ['salam', 'sneeze', 'sick'], entries: [
      { guide: 'تطعم الطعام، وتقرأ السلام على من عرفت ومن لم تعرف', only: 'salam', hid: 'salam-1', source: 'متفق عليه' },
      { guide: 'أفشوا السلام بينكم', only: 'salam', hid: 'salam-2', source: 'رواه مسلم', hadithPick: ['لا تدخلون الجنة', 'أفشوا السلام بينكم'] },
      { guide: 'حق المسلم على المسلم ست: إذا لقيته فسلّم عليه، وإذا دعاك فأجبه، وإذا استنصحك فانصحه، وإذا عطس فحمد الله فشمّته، وإذا مرض فعُده، وإذا مات فاتبعه',
        only: 'sick', hid: 'haqq-al-muslim', source: 'رواه مسلم' },
      { ref: 'alhamdulillah', only: 'sneeze', note: 'يقوله العاطس', hadith: 'hisn-188' },
      { ref: 'yarhamukallah', only: 'sneeze', note: 'يقوله له أخوه أو صاحبه', hadith: 'hisn-188' },
      { ref: 'yahdikumullah', only: 'sneeze', note: 'ويردّ العاطس', hadith: 'hisn-188' },
      { guide: 'إذا عطس أحدكم فحمد الله فشمّتوه، فإن لم يحمد الله فلا تشمّتوه', only: 'sneeze', hid: 'tashmit', source: 'رواه مسلم' },
      { guide: 'التثاؤب من الشيطان، فإذا تثاءب أحدكم فليمسك بيده على فيه ما استطاع', only: 'sneeze', hid: 'tathawub', source: 'رواه مسلم' },
    ] },
  ],
};
