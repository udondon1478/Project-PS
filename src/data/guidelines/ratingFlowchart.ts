import { RatingFlowchart } from './types';

export const ratingFlowchart: RatingFlowchart = {
  startQuestionId: 'q1',
  questions: [
    {
      id: 'q1',
      text: '性的な部位や行為のデータが含まれていますか？',
      description: '3Dモデルとして性器が作られている、陰部のテクスチャがリアルに描かれている、または性行為のアニメーションデータが含まれていますか？',
      yesNext: 'explicit',
      noNext: 'q2',
      order: 1
    },
    {
      id: 'q2',
      text: '乳首や性器周辺の描写がありますか？',
      description: 'サムネイルや商品画像において、乳首、肛門、陰毛などが描写されていますか？（テクスチャの書き込み含む）また、それらが透けて見える衣装ですか？',
      yesNext: 'questionable',
      noNext: 'q3',
      order: 2
    },
    {
      id: 'q3',
      text: '性的な道具や拘束具が含まれますか？',
      description: 'バイブレーター、ディルドなどの性具、または拘束具などの性的な用途を主とするアイテムが含まれていますか？',
      yesNext: 'questionable',
      noNext: 'q4',
      order: 3
    },
    {
      id: 'q4',
      text: '露出度の高い衣装ですか？',
      description: '下着、マイクロビキニ、または肌の露出が極端に多い衣装（ニプレスのみ等）ですか？',
      yesNext: 'sensitive',
      noNext: 'q5',
      order: 4
    },
    {
      id: 'q5',
      text: '性的な部位を強調していますか？',
      description: 'サムネイルや画像で、胸や臀部、股間を強調するアングルや、扇情的なポーズ（M字開脚など）をとっていますか？',
      yesNext: 'sensitive',
      noNext: 'q6',
      order: 5
    },
    {
      id: 'q6',
      text: '下着が見える構図ですか？',
      description: 'パンチラやスカートの中を覗き込むようなアングル（ローアングル）の画像が含まれていますか？',
      yesNext: 'sensitive',
      noNext: 'q7',
      order: 6
    },
    {
      id: 'q7',
      text: '全年齢向けとして問題ありませんか？',
      description: '職場や学校などで閲覧しても問題ない、性的な要素を含まないコンテンツですか？',
      yesNext: 'general',
      noNext: 'sensitive',
      order: 7
    }
  ]
};
