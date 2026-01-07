import { RatingFlowchart } from './types';

export const ratingFlowchart: RatingFlowchart = {
  startQuestionId: 'q1',
  questions: [
    {
      id: 'q1',
      text: '露骨な性器の露出がありますか?',
      description: '性器(陰部、ペニス、肛門など)が露出している、または明確に見える描写はありますか?(検閲の有無を問わず)',
      yesNext: 'explicit',
      noNext: 'q1-a',
      order: 1
    },
    {
      id: 'q1-a',
      text: '体液の描写がありますか?',
      description: '精液、体液、または性行為に関連する液体の描写がありますか?',
      yesNext: 'explicit',
      noNext: 'q2',
      order: 2
    },
    {
      id: 'q2',
      text: '明示的な性行為の描写がありますか?',
      description: '性交、フェラチオ、手淫、指入れ、セックストイの使用などの明示的な性行為が描写されていますか?',
      yesNext: 'explicit',
      noNext: 'q3',
      order: 3
    },
    {
      id: 'q3',
      text: '極端なグラフィック暴力がありますか?',
      description: 'ゴア、切断、内臓露出などの極端にグラフィックな暴力表現(NSFL相当)がありますか?',
      yesNext: 'explicit',
      noNext: 'q4',
      order: 4
    },
    {
      id: 'q4',
      text: '性器以外のヌードがありますか?',
      description: '乳首、乳輪、素肌のお尻など、性器以外の性的部位の露出がありますか?',
      yesNext: 'q4-a',
      noNext: 'q5',
      order: 5
    },
    {
      id: 'q4-a',
      text: '性的な文脈での露出ですか?',
      description: 'その露出は性的な文脈や示唆的なポーズを伴っていますか?',
      yesNext: 'questionable',
      noNext: 'sensitive',
      order: 6
    },
    {
      id: 'q5',
      text: '露出度の高い服装や透ける服装がありますか?',
      description: '水着、ランジェリー、下着、透ける服、ウェット服などの露出度の高い服装がありますか?',
      yesNext: 'q5-a',
      noNext: 'q6',
      order: 7
    },
    {
      id: 'q5-a',
      text: '性的部位が強調されていますか?',
      description: '胸、お尻、股間などの性的部位に焦点を当てた構図やポーズですか?',
      yesNext: 'sensitive',
      noNext: 'q5-b',
      order: 8
    },
    {
      id: 'q5-b',
      text: '服越しに性器や乳首が透けていますか?',
      description: '薄い服を通して乳首や性器の輪郭が明確に見えますか?',
      yesNext: 'questionable',
      noNext: 'sensitive',
      order: 9
    },
    {
      id: 'q6',
      text: '軽度な性的接触や示唆がありますか?',
      description: '耳噛み、股間への触れ合い、胸への触れ合い、激しいキス、または性的示唆のあるポーズやジェスチャーがありますか?',
      yesNext: 'q6-a',
      noNext: 'q7',
      order: 10
    },
    {
      id: 'q6-a',
      text: '性行為の直接的な示唆ですか?',
      description: 'フェラチオのジェスチャーや、性行為を直接示唆する行為がありますか?',
      yesNext: 'questionable',
      noNext: 'sensitive',
      order: 11
    },
    {
      id: 'q7',
      text: 'パンチラやアップスカートなどがありますか?',
      description: 'パンツが見える、スカートの下が見える、またはそれに類似するファンサービス的な表現がありますか?',
      yesNext: 'sensitive',
      noNext: 'q8',
      order: 12
    },
    {
      id: 'q8',
      text: '性的な小道具や背景要素がありますか?',
      description: 'コンドーム、セックストイ、ラブホテルなど、性的な文脈を示唆する小道具や背景がありますか?',
      yesNext: 'q8-a',
      noNext: 'q9',
      order: 13
    },
    {
      id: 'q8-a',
      text: '使用中または露骨に見えますか?',
      description: '性的な小道具が使用されている、または非常に明確に描写されていますか?',
      yesNext: 'questionable',
      noNext: 'sensitive',
      order: 14
    },
    {
      id: 'q9',
      text: 'グラフィックな暴力表現がありますか?',
      description: '大量の血液、深刻な怪我、死の描写、虐待など、グラフィックまたは不穏な暴力表現がありますか?',
      yesNext: 'questionable',
      noNext: 'q10',
      order: 15
    },
    {
      id: 'q10',
      text: '軽度な暴力や血液がありますか?',
      description: '軽い擦り傷、打撲、切り傷、少量の血液など、軽度な暴力表現がありますか?',
      yesNext: 'sensitive',
      noNext: 'q11',
      order: 16
    },
    {
      id: 'q11',
      text: '自傷や違法薬物の描写がありますか?',
      description: '自殺や自傷の描写、または違法薬物の使用が含まれていますか?',
      yesNext: 'sensitive',
      noNext: 'q12',
      order: 17
    },
    {
      id: 'q12',
      text: '完全に非性的で安全な内容ですか?',
      description: '職場や公共の場で安全に閲覧できる、完全に非性的で不適切な要素のない内容ですか?',
      yesNext: 'general',
      noNext: 'sensitive',
      order: 18
    },
  ]
};
