export interface Texto {
  id: string;
  idioma: "pt" | "en";
  ano: number;
  titulo: string;
  corpo: string;
}

export const TEXTOS: Texto[] = [
  {
    id: "bola-azul",
    idioma: "pt",
    ano: 1,
    titulo: "A bola azul",
    corpo:
      "Lia tem uma bola azul. A bola pula no chão e rola pela sala. O gato vê a bola e corre atrás dela. A bola bate na porta e para. O gato pula em cima da bola. Lia ri muito. Ela pega a bola e joga de novo. Agora o gato e a menina brincam juntos no quintal.",
  },
  {
    id: "horta-da-escola",
    idioma: "pt",
    ano: 2,
    titulo: "A horta da escola",
    corpo:
      "Na escola de Davi tem uma horta atrás do refeitório. Cada turma cuida de um canteiro. A turma de Davi plantou alface, cenoura e tomate. Toda manhã, as crianças regam as plantas com um regador verde. Um dia, Davi viu que as folhas da alface estavam cheias de furos. Quem estava comendo a horta? A professora pediu que todos olhassem com atenção. Debaixo de uma folha, Davi achou uma lagarta gorda e listrada. As crianças levaram a lagarta para o jardim, longe dos canteiros. Semanas depois, ela virou uma borboleta amarela.",
  },
  {
    id: "faltou-luz",
    idioma: "pt",
    ano: 3,
    titulo: "O dia em que faltou luz",
    corpo:
      "Era uma noite de chuva forte quando a luz acabou na rua de Clara. A casa ficou tão escura que ela não conseguia ver as próprias mãos. Seu irmão menor começou a chorar, com medo do barulho dos trovões. Clara lembrou que a avó guardava velas na gaveta da cozinha. Andando devagar e tateando as paredes, ela chegou até lá e encontrou a caixa de fósforos. O pai acendeu as velas, e a sala se encheu de uma luz alaranjada. Para acalmar o irmão, Clara inventou um jogo de sombras. Com as mãos, fez um cachorro, um pássaro e um coelho na parede. O menino parou de chorar e quis aprender também. Quando a luz voltou, os dois reclamaram que a brincadeira tinha acabado cedo demais.",
  },
  {
    id: "biblioteca-do-bairro",
    idioma: "pt",
    ano: 4,
    titulo: "A biblioteca do bairro",
    corpo:
      "No fim da rua onde Mateus morava, havia uma casa antiga que ninguém visitava. As janelas estavam quebradas e o jardim tinha virado um matagal. Num sábado, os moradores do bairro se reuniram para decidir o que fazer com aquele lugar abandonado. Alguns queriam derrubar a casa, outros preferiam vendê-la. Mateus levantou a mão e sugeriu que ali funcionasse uma biblioteca. No começo, os adultos acharam graça da ideia, mas dona Rosa, que tinha sido professora, apoiou o menino. Durante meses, as famílias trabalharam juntas. Pintaram as paredes, consertaram o telhado e fizeram prateleiras com madeira reaproveitada. Cada casa doou os livros que já não usava. No dia da inauguração, a fila dava volta no quarteirão. Dona Rosa diz que aquela casa nunca esteve tão cheia de vida. Hoje, Mateus passa as tardes lá, lendo histórias para as crianças menores e ajudando a arrumar os livros que chegam toda semana.",
  },
  {
    id: "lost-kite",
    idioma: "en",
    ano: 2,
    titulo: "The lost kite",
    corpo:
      "Sam had a red kite with a long yellow tail. On a windy day, he ran to the park with his dad. The kite went up and up until it looked as small as a bird. Then a strong gust pulled the string out of his hand. The kite flew over the trees and was gone. Sam felt sad all the way home. The next morning, a girl knocked on the door. She was holding a red kite with a yellow tail. It had landed in her garden. Sam and the girl flew it together that afternoon.",
  },
  {
    id: "quiet-garden",
    idioma: "en",
    ano: 4,
    titulo: "The quiet garden",
    corpo:
      "Maya's grandmother lived in a small house at the edge of town, and behind it was a garden that everyone called the quiet garden. There were no fountains or statues, only tall sunflowers, rows of beans, and a wooden bench under an old apple tree. Every summer, Maya helped her grandmother pull weeds and water the plants before the sun grew too hot. One afternoon, Maya noticed that the bees had stopped visiting the flowers. Her grandmother explained that a neighbor had started spraying chemicals on his lawn. Instead of arguing, they baked a pie with apples from the tree and carried it next door. While they ate, Maya talked about how bees carry pollen from flower to flower so that fruit can grow. The neighbor listened carefully. The following week, he put away the spray and planted a row of lavender along the fence. By August, the garden was buzzing again.",
  },
];
