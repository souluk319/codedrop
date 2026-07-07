/**
 * Long-form typing packs for CodeDrop.
 *
 * Bundled packs use original practice text, folk sayings, or short public-style
 * practice lines. Copyrighted song lyrics are intentionally not bundled.
 */

const LONG_TEXT_PACKS = [
    {
        id: 'ko_focus_flow',
        group: 'Korean',
        title: '한글 집중 문장',
        label: 'Korean Focus Flow',
        source: 'ORIGINAL',
        tags: ['korean', 'original', 'keyboard'],
        text: `키보드는 생각을 화면으로 옮기는 가장 빠른 통로입니다.
처음에는 속도보다 정확도를 먼저 잡아야 합니다.
손가락이 자리를 기억하면 긴 문장도 흔들리지 않습니다.
짧은 단어를 맞히는 연습 뒤에는 호흡이 긴 문장을 따라 치며 리듬을 만드는 시간이 필요합니다.
오늘의 목표는 빠르게 치는 것이 아니라 끝까지 흐름을 놓치지 않는 것입니다.`
    },
    {
        id: 'ko_proverbs',
        group: 'Korean',
        title: '한국 속담',
        label: 'Korean Proverbs',
        source: 'FOLK SAYINGS',
        tags: ['korean', 'proverb', 'culture'],
        text: `가는 말이 고와야 오는 말이 곱다.
고래 싸움에 새우 등 터진다.
구슬이 서 말이라도 꿰어야 보배다.
낮말은 새가 듣고 밤말은 쥐가 듣는다.
돌다리도 두들겨 보고 건너라.
바늘 도둑이 소 도둑 된다.
서당 개 삼 년이면 풍월을 읊는다.
시작이 반이다.`
    },
    {
        id: 'ko_public_literature_style',
        group: 'Korean',
        title: '한국 문학풍 산문',
        label: 'Korean Literary Style',
        source: 'ORIGINAL',
        tags: ['korean', 'prose', 'classic-style'],
        text: `새벽의 골목은 아직 말이 없고, 작은 가게의 간판만 희미하게 빛났다.
누군가는 하루의 첫 버스를 기다리고, 누군가는 밤새 미루어 둔 문장을 다시 읽는다.
도시는 언제나 서둘러 움직이지만, 마음이 따라오려면 잠깐의 쉼표가 필요하다.
천천히 숨을 고르고 한 글자씩 눌러 적으면, 복잡하던 생각도 차례를 찾아 줄을 선다.`
    },
    {
        id: 'ko_classic_sijo_rhythm',
        group: 'Korean',
        title: '한국 고전 운문 리듬',
        label: 'Korean Classic Verse Rhythm',
        source: 'ORIGINAL CLASSIC-STYLE',
        tags: ['korean', 'classic-style', 'poetry-practice'],
        text: `바람이 낮은 처마를 지나가면 오래된 문장은 다시 살아납니다.
산 너머 물소리는 느리지만 끝내 길을 잃지 않습니다.
짧은 구절을 또박또박 치다 보면 받침과 모음의 간격이 손끝에 남습니다.
운문 연습은 빠른 입력보다 호흡, 줄바꿈, 쉼표의 위치를 기억하는 데 좋습니다.
한 글자씩 놓치지 않고 따라가며 오래된 말의 리듬을 키보드 위에 옮겨 봅니다.`
    },
    {
        id: 'ko_textbook_poem_practice',
        group: 'Korean',
        title: '교과서 시 감상 연습',
        label: 'Textbook Poem Practice',
        source: 'ORIGINAL EDUCATIONAL STYLE',
        tags: ['korean', 'textbook-style', 'poetry-practice'],
        text: `창밖의 나무는 계절마다 다른 문장을 보여 줍니다.
봄에는 새잎이 짧은 인사처럼 돋고, 여름에는 그늘이 길게 펼쳐집니다.
가을의 바람은 떨어지는 잎을 천천히 읽게 하고, 겨울의 가지는 남은 것을 또렷하게 보여 줍니다.
시를 따라 치는 연습은 단어보다 문장의 숨을 익히는 일입니다.
줄이 바뀌는 곳에서 잠깐 멈추고, 다시 시작하는 손끝의 리듬을 기억해 봅니다.`
    },
    {
        id: 'ko_aegukga_safe_practice',
        group: 'Korean',
        title: '애국가 테마 연습문',
        label: 'Patriotic Theme Practice',
        source: 'ORIGINAL THEME',
        tags: ['korean', 'theme', 'public'],
        text: `하늘과 바다와 산을 떠올리며 또박또박 문장을 입력합니다.
나라를 사랑한다는 마음은 거창한 구호보다 매일의 성실함에서 자랍니다.
함께 부르는 노래처럼 키보드의 리듬도 일정해야 합니다.
정확한 입력은 작은 약속을 지키는 연습이고, 꾸준한 반복은 실력을 만드는 가장 단단한 길입니다.`
    },
    {
        id: 'ko_keyboard_reviewer_flow',
        group: 'Korean',
        title: '한글 키보드 리뷰어 문장',
        label: 'Korean Keyboard Reviewer',
        source: 'ORIGINAL TEST PASSAGE',
        tags: ['korean', 'keyboard-review', 'punctuation'],
        text: `키보드 리뷰는 예쁜 소리만 듣는 일이 아닙니다.
왼손과 오른손이 번갈아 움직이는지, 받침이 많은 단어에서 입력이 꼬이지 않는지, 긴 문장을 칠 때 손목이 불편하지 않은지 확인해야 합니다.
가나다라마바사아자차카타파하, 각난닫랄맘밥삿앙잣찻칵탓팟항처럼 받침과 모음을 번갈아 입력합니다.
숫자 12345와 67890, 쉼표, 마침표, 괄호, 따옴표까지 이어서 눌러 보면 배열의 균형이 더 분명하게 드러납니다.
정확도 98퍼센트를 유지하면서 3분 이상 입력해도 손가락이 무너지지 않는다면, 그 키보드는 장문 작업에 꽤 믿음직합니다.`
    },
    {
        id: 'en_keyboard_quotes',
        group: 'English',
        title: 'English Practice Quotes',
        label: 'English Quotes',
        source: 'ORIGINAL',
        tags: ['english', 'quotes', 'focus'],
        text: `Clear hands make clear commands.
Accuracy is the quiet engine behind speed.
A good typist does not chase the word; the word arrives where the fingers already are.
Practice turns hesitation into rhythm.
When the screen becomes crowded, breathe once and type the next exact character.`
    },
    {
        id: 'en_keyboard_reviewer_pangram',
        group: 'English',
        title: 'English Keyboard Reviewer',
        label: 'English Keyboard Reviewer',
        source: 'ORIGINAL TEST PASSAGE',
        tags: ['english', 'keyboard-review', 'pangram'],
        text: `The quick brown fox jumps over the lazy dog, but a serious keyboard review needs more than one famous sentence.
Type numbers 12345 and 67890, then test punctuation: comma, period, colon, slash, brackets, quotes, and a careful question mark?
A reviewer checks whether the home row feels stable, whether repeated letters stay clean, and whether long words like characterization, synchronization, and responsibility remain comfortable.
Fast typing is useful, but steady typing tells the truth.
If your hands can stay relaxed through this paragraph, the keyboard is ready for essays, code reviews, tickets, commits, and long late-night notes.`
    },
    {
        id: 'en_british_proverbs',
        group: 'English',
        title: 'British Proverbs',
        label: 'British Proverbs',
        source: 'COMMON SAYINGS',
        tags: ['english', 'proverb'],
        text: `A stitch in time saves nine.
Many hands make light work.
Look before you leap.
The early bird catches the worm.
Where there is a will, there is a way.
Better late than never.
Practice makes perfect.
Actions speak louder than words.`
    },
    {
        id: 'en_public_lit_rhythm',
        group: 'English',
        title: 'Public Literature Rhythm',
        label: 'Public Literature',
        source: 'ORIGINAL PUBLIC-STYLE',
        tags: ['english', 'literature-style', 'rhythm'],
        text: `The old road was quiet, but every step carried a small decision.
Morning light crossed the window and found the desk already waiting.
A careful reader notices the comma, the pause, and the change in breath.
Long-form typing is not only speed; it is the practice of keeping attention alive across a full paragraph.
When the sentence turns, the fingers should turn with it.`
    },
    {
        id: 'en_public_quote_practice',
        group: 'English',
        title: 'Short Quote Practice',
        label: 'Short Quote Practice',
        source: 'ORIGINAL QUOTE-STYLE',
        tags: ['english', 'quote-style', 'focus'],
        text: `Begin with one exact key.
Keep the line simple and the movement clean.
A steady hand is faster than a hurried hand.
If the word feels difficult, slow down until it becomes familiar.
The best practice is honest: every mistake shows the next place to improve.`
    },
    {
        id: 'en_tech_onboarding',
        group: 'English',
        title: 'Tech Onboarding Lines',
        label: 'Tech Onboarding',
        source: 'ORIGINAL',
        tags: ['english', 'work', 'tech'],
        text: `Read the error before changing the code.
Name the problem, then choose the command.
A clean commit tells the next engineer what changed and why.
When a service fails, check the logs, the environment, the network, and the data path.
Good operations work is calm, repeatable, and easy to explain.`
    },
    {
        id: 'en_power_pop_safe',
        group: 'English',
        title: 'Power Pop Practice',
        label: 'Power Pop Practice',
        source: 'ORIGINAL',
        tags: ['english', 'music-style', 'practice'],
        text: `I keep moving when the lights get loud.
Every step becomes a signal, every breath becomes a beat.
This is not a lyric copy; it is a clean practice passage for pop-style rhythm.
Type the line, catch the pulse, and keep the words steady until the final character lands.
Confidence grows when the pattern stops feeling strange.`
    },
    {
        id: 'en_ballad_practice_safe',
        group: 'English',
        title: 'Ballad Rhythm Practice',
        label: 'Ballad Rhythm Practice',
        source: 'ORIGINAL',
        tags: ['english', 'music-style', 'ballad-practice'],
        text: `Soft lines need steady fingers.
Hold the pause, type the space, and let the next word arrive without panic.
This passage is written for ballad-style typing rhythm and does not copy any song.
Long vowels, small pauses, and repeated sounds make good practice for careful English input.
When the final line lands, check whether the rhythm stayed even from start to finish.`
    },
    {
        id: 'mixed_pop_stage_safe',
        group: 'Mixed',
        title: 'K-pop Stage Practice',
        label: 'K-pop Style Practice',
        source: 'ORIGINAL',
        tags: ['mixed', 'korean', 'english', 'stage'],
        text: `오늘의 stage는 neon light 아래에서 시작된다.
Count the beat, keep the line, and move like the keyboard is part of the song.
손끝이 흔들리면 rhythm도 흔들린다.
No copied lyrics here, just practice lines for flow, timing, and confidence.
한글과 English를 오가며 자연스럽게 입력 감각을 익힌다.`
    },
    {
        id: 'mixed_keyboard_reviewer',
        group: 'Mixed',
        title: '한영 키보드 리뷰어 문장',
        label: 'Mixed Keyboard Reviewer',
        source: 'ORIGINAL TEST PASSAGE',
        tags: ['mixed', 'keyboard-review', 'korean', 'english'],
        text: `오늘은 CodeDrop으로 한영 장문 입력을 테스트합니다.
Start with a calm sentence, then switch back to 한글 without losing rhythm.
파일 경로는 /var/log/app/error.log 처럼 입력하고, 명령어는 oc get pods -n demo --watch 처럼 공백과 하이픈을 정확히 맞춥니다.
키보드가 좋은지 보려면 단어 하나보다 문장 전체가 중요합니다.
Korean, English, numbers 2026, symbols [], {}, (), and terminal-style commands should all feel predictable under your fingers.
마지막 줄까지 흔들리지 않으면 이 배열은 공부, 코딩, 문서 작성, 게임형 타자연습까지 충분히 버틸 수 있습니다.`
    },
    {
        id: 'mixed_idol_intro_safe',
        group: 'Mixed',
        title: 'Idol Intro Practice',
        label: 'Idol Intro Practice',
        source: 'ORIGINAL',
        tags: ['mixed', 'korean', 'english', 'idol-style'],
        text: `첫 verse는 Korean으로 시작하고 hook은 English로 살짝 방향을 튼다.
Say my name, check the timing, and keep your hands on the home row.
무대 위의 반짝임보다 중요한 건 다음 글자를 정확히 아는 감각이다.
This pack is for mixed-language typing flow, not copied song lyrics.
한 줄씩 넘어가며 beat, breath, and keyboard control을 같이 연습한다.`
    },
    {
        id: 'template_lyrics_user_provided',
        group: 'User Templates',
        type: 'template',
        title: '노래 가사 직접입력',
        label: 'Lyrics · USER PROVIDED',
        source: 'USER PROVIDED',
        providerId: 'manual_lyrics_user_001',
        tags: ['mixed', 'lyrics-template', 'user-provided', 'song'],
        preprocess: 'lyrics',
        promptText: '보유한 가사나 직접 작성한 노래형 텍스트를 붙여넣어 개인 장문타자 연습에 사용합니다. 시작할 때 괄호 속 애드립/코러스 표기는 자동으로 정리됩니다.',
        text: ''
    }
];

if (typeof window !== 'undefined') {
    window.LONG_TEXT_PACKS = LONG_TEXT_PACKS;
}
