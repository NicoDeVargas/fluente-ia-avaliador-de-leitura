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
  {
    id: "sapo-da-lagoa",
    idioma: "pt",
    ano: 1,
    titulo: "O sapo da lagoa",
    corpo:
      "Perto da casa de Pedro tem uma lagoa. Na lagoa mora um sapo verde. O sapo passa o dia em cima de uma folha grande. Quando vê uma mosca, ele abre a boca e pega a mosca com a língua. Pedro gosta de ver o sapo pular na água. De noite, o sapo canta com os amigos. Pedro dorme ouvindo a música da lagoa.",
  },
  {
    id: "depois-da-chuva",
    idioma: "pt",
    ano: 1,
    titulo: "Depois da chuva",
    corpo:
      "Hoje choveu muito. Nina ficou em casa com a mãe. Ela olhou pela janela e viu as gotas caindo na rua. Depois da chuva, o sol voltou. Nina calçou as botas amarelas e foi para o quintal. Ela pulou nas poças e molhou a roupa toda. A mãe riu e deu uma toalha para ela. No céu, apareceu um arco-íris bem bonito.",
  },
  {
    id: "pipoca",
    idioma: "pt",
    ano: 2,
    titulo: "Um amigo chamado Pipoca",
    corpo:
      "Ana queria muito um cachorro. Num domingo, a família foi até um abrigo de animais. Lá havia cães grandes, pequenos, pretos e malhados. Um filhote marrom chegou perto da grade e lambeu a mão de Ana. Ele tinha uma orelha em pé e outra caída. Ana soube na hora que era ele. O filhote ganhou o nome de Pipoca, porque pulava sem parar. Em casa, Pipoca cheirou cada canto e depois dormiu no tapete da sala. Agora, toda tarde, Ana leva o amigo para passear na praça.",
  },
  {
    id: "formigas",
    idioma: "pt",
    ano: 2,
    titulo: "As formigas trabalham juntas",
    corpo:
      "As formigas são insetos pequenos, mas muito fortes. Uma formiga consegue carregar folhas bem maiores do que ela. Elas vivem em grupos que moram no formigueiro, embaixo da terra. Dentro do formigueiro existem muitos túneis e salas. Cada formiga tem uma tarefa. Algumas buscam comida, outras cuidam dos ovos e outras protegem a entrada. Quando uma formiga acha comida, ela deixa um cheiro no caminho. Assim, as outras sabem para onde ir. Por isso vemos tantas formigas andando em fila.",
  },
  {
    id: "bicho-preguica",
    idioma: "pt",
    ano: 3,
    titulo: "O bicho-preguiça",
    corpo:
      "O bicho-preguiça vive nas árvores das florestas do Brasil. Ele passa quase o dia inteiro pendurado nos galhos, preso pelas garras compridas e curvas. Como se move muito devagar, muita gente pensa que ele é apenas preguiçoso. Na verdade, o seu corpo gasta pouca energia, porque ele come quase só folhas, que dão pouca força. Por isso, a preguiça dorme bastante e anda sem pressa. Esse jeito calmo também ajuda a proteger o animal. Parado no alto das árvores, ele quase não é notado pelos gaviões e pelas onças. Às vezes, pequenas plantas crescem no seu pelo e deixam o bicho esverdeado. A preguiça só desce ao chão de vez em quando. E, por mais estranho que pareça, ela é uma ótima nadadora.",
  },
  {
    id: "sabado-de-feira",
    idioma: "pt",
    ano: 3,
    titulo: "Sábado de feira",
    corpo:
      "Todo sábado, Caio acorda cedo para ir à feira com a avó. A rua fica cheia de barracas coloridas, e os feirantes gritam os preços para chamar os fregueses. A avó de Caio sempre começa pela barraca de frutas. Ela aperta as mangas com cuidado e cheira os abacaxis antes de escolher. Caio gosta mesmo é da barraca de pastel, bem no meio da rua. Enquanto espera o pastel ficar pronto, ele observa o movimento. Um senhor vende passarinhos de madeira, e uma moça oferece caldo de cana gelado. Neste sábado, a avó deixou Caio pagar as compras sozinho. Ele contou as moedas com atenção e ainda recebeu o troco certo. Na volta, carregou a sacola mais pesada, orgulhoso de ter ajudado.",
  },
  {
    id: "tartarugas-marinhas",
    idioma: "pt",
    ano: 4,
    titulo: "As tartarugas marinhas",
    corpo:
      "Todos os anos, nas praias do litoral brasileiro, acontece algo muito especial. Durante a noite, tartarugas marinhas saem do mar e arrastam o corpo pesado pela areia. Cada fêmea cava um buraco fundo, coloca muitos ovos e depois os cobre com cuidado antes de voltar para a água. Os ovos ficam escondidos por várias semanas, aquecidos pelo sol. Curiosamente, a temperatura da areia decide se os filhotes serão machos ou fêmeas. Quando nascem, as pequenas tartarugas precisam correr até o mar o mais rápido possível, porque caranguejos e aves estão sempre por perto. As luzes das casas e dos postes podem confundir os filhotes, que acabam indo na direção errada. Por isso, em muitas praias, voluntários protegem os ninhos, apagam as luzes e ajudam os filhotes a encontrar o caminho. Poucos chegam à vida adulta, mas os que sobrevivem podem viver por muitas décadas.",
  },
  {
    id: "nova-aluna",
    idioma: "pt",
    ano: 4,
    titulo: "A nova aluna",
    corpo:
      "Quando Lara chegou à nova escola, no meio do ano, não conhecia ninguém. Ela tinha se mudado de uma cidade do interior para a capital, e tudo parecia grande e barulhento demais. No primeiro recreio, sentou sozinha num banco e fingiu estar ocupada com a lancheira. Uma menina chamada Bruna se aproximou e perguntou se ela sabia jogar bolinha de gude. Lara não sabia, mas aceitou aprender. Bruna explicou as regras com paciência e riu junto quando as bolinhas de Lara saíam para o lado errado. Nos dias seguintes, outras crianças começaram a participar do jogo. Lara descobriu que era ótima em mirar de longe e logo virou a campeã do recreio. No fim do ano, a professora pediu que cada aluno escrevesse sobre um momento importante. Lara escreveu sobre o banco vazio do primeiro dia e sobre a menina que se sentou ao seu lado.",
  },
  {
    id: "viagem-da-agua",
    idioma: "pt",
    ano: 5,
    titulo: "A viagem da água",
    corpo:
      "A água que você bebe hoje pode ter passado por nuvens, rios e até geleiras antes de chegar à sua casa. Isso acontece porque a água do planeta está sempre em movimento, num caminho que os cientistas chamam de ciclo da água. Tudo começa com o calor do sol, que aquece mares, lagos e rios. Aos poucos, parte dessa água se transforma em vapor, um gás invisível que sobe para o céu. Lá em cima, onde o ar é mais frio, o vapor forma gotinhas minúsculas que se juntam e dão origem às nuvens. Quando as gotas ficam pesadas demais, caem como chuva ou, em lugares muito frios, como neve e granizo. Uma parte dessa água escorre pela terra até os rios, que a levam de volta ao mar. Outra parte penetra no solo e forma reservas subterrâneas, de onde vêm muitas nascentes. As plantas também participam, pois absorvem água pelas raízes e soltam vapor pelas folhas. Por isso, cuidar das florestas e dos rios é cuidar da água que todos nós usamos.",
  },
  {
    id: "quadrilha",
    idioma: "pt",
    ano: 5,
    titulo: "A quadrilha da turma",
    corpo:
      "Faltava apenas uma semana para a festa junina, e a turma de Bento ainda não conseguia ensaiar a quadrilha sem confusão. Metade das crianças errava o passo, a outra metade esquecia a hora de trocar de par, e o túnel sempre desabava no meio. A professora já estava quase desistindo quando Bento teve uma ideia. Ele levou a música para casa e passou a tarde inteira desenhando no caderno cada movimento, com setas e bonequinhos. No dia seguinte, colou os desenhos na parede da sala, na ordem certa, e sugeriu que ensaiassem por partes. Primeiro, apenas a entrada. Depois, o caminho da roça. Por último, a grande roda. Aos poucos, até os colegas mais atrapalhados começaram a acertar. Na noite da festa, o pátio estava enfeitado com bandeirinhas e cheirava a milho cozido. Quando a sanfona começou a tocar, a turma dançou do começo ao fim sem nenhum tropeço. Os pais aplaudiram de pé, e a professora contou a todos quem tinha salvado a quadrilha.",
  },
  {
    id: "morcegos",
    idioma: "pt",
    ano: 5,
    titulo: "Os morcegos",
    corpo:
      "Os morcegos têm fama de assustadores, mas são animais muito importantes para a natureza. Eles são os únicos mamíferos capazes de voar de verdade, batendo as asas como os pássaros. Suas asas, porém, são diferentes: formadas por uma pele fina esticada entre dedos compridos, parecem mãos abertas. A maioria dos morcegos sai para buscar alimento à noite. Para não bater em árvores e paredes no escuro, muitos deles emitem sons agudos que as pessoas não conseguem ouvir. Esses sons batem nos objetos e voltam como um eco, revelando o caminho e a posição dos insetos. Existem morcegos que comem insetos, outros que preferem frutas e alguns que bebem o néctar das flores. Os que comem frutas espalham sementes pela floresta e ajudam novas árvores a nascer. Os que visitam flores levam pólen de uma planta para outra, assim como as abelhas. Sem os morcegos, muitas plantas teriam dificuldade para se reproduzir. Por isso, em vez de medo, eles merecem nosso respeito e proteção.",
  },
  {
    id: "rex-the-dog",
    idioma: "en",
    ano: 1,
    titulo: "Rex at the park",
    corpo:
      "Ben has a big brown dog named Rex. Rex likes to run in the park. He runs to the pond and looks at the ducks. The ducks swim away fast. Then Rex sees a stick on the grass. He picks it up and brings it to Ben. Ben throws the stick far. Rex runs and gets it again. At home, Rex drinks some water and naps on his bed.",
  },
  {
    id: "little-seed",
    idioma: "en",
    ano: 1,
    titulo: "The little seed",
    corpo:
      "Ruby put a little seed in a pot. She gave it water and set it in the sun. Every day she looked at the pot, but she saw only dirt. Then one morning, a tiny green leaf came up. Ruby was so happy! The plant grew tall. Soon it had a big yellow flower. Ruby showed the flower to her mom and dad.",
  },
  {
    id: "class-fish",
    idioma: "en",
    ano: 2,
    titulo: "The class fish",
    corpo:
      "Our class has a pet fish named Bubbles. He is orange with a white spot on his back. Bubbles lives in a glass tank next to the window. Each week, a different child gets to feed him. This week it is Tom's turn. Tom must give Bubbles only a small pinch of food, because too much can make a fish sick. On Friday, Tom forgot to close the lid. Bubbles did not jump out, but the teacher said Tom was lucky. Now Tom always checks the lid twice before he goes home.",
  },
  {
    id: "moon-shapes",
    idioma: "en",
    ano: 3,
    titulo: "Why the moon changes shape",
    corpo:
      "Have you ever noticed that the moon looks different from night to night? Sometimes it is a full, bright circle, and other times it is only a thin curve like a smile. The moon does not really change shape. It does not make its own light either. Instead, it shines because sunlight bounces off its surface. As the moon travels around the Earth, we see different parts of its sunny side. When the moon is between the Earth and the sun, the bright side faces away from us, and the moon seems to disappear. A couple of weeks later, the whole bright side faces us, and we see a full moon. Then the cycle begins again.",
  },
  {
    id: "lemonade-stand",
    idioma: "en",
    ano: 3,
    titulo: "The lemonade stand",
    corpo:
      "On the first hot day of summer, Max and his sister Kim decided to open a lemonade stand. They squeezed lemons, stirred in sugar, and filled a big jug with ice. Kim painted a sign with bright letters, and Max set up a table at the end of the driveway. For a long time, nobody stopped. Cars drove past, and the ice began to melt. Max wanted to give up, but Kim had an idea. She carried the sign to the park, where children were playing soccer. Soon a line of thirsty players formed in front of the stand. By the end of the afternoon, the jug was empty. They used the money to buy a new soccer ball for the park.",
  },
  {
    id: "float-or-sink",
    idioma: "en",
    ano: 4,
    titulo: "Float or sink?",
    corpo:
      "Leo had always wondered why some things float and others sink. For the school science fair, he decided to find out. He filled a large tub with water and collected objects from around the house: a spoon, an apple, a rubber duck, a coin, a candle, and a small rock. Before testing each one, he wrote down his guess. He was sure the apple would sink because it felt heavy, but it bobbed at the surface. The tiny coin, on the other hand, dropped straight to the bottom. His teacher explained that what matters is not only how heavy something is, but also how much space it takes up. An apple has lots of air inside, while a coin is small and packed tight. Leo drew a chart to show his results and added a question for visitors: will an orange float with its peel on? Many people guessed wrong.",
  },
  {
    id: "amazon-river",
    idioma: "en",
    ano: 5,
    titulo: "The Amazon River",
    corpo:
      "The Amazon River winds through the largest rainforest on Earth. It begins as tiny streams high in the Andes Mountains and travels across South America until it reaches the Atlantic Ocean on the coast of Brazil. Along the way, thousands of smaller rivers join it, and by the time it meets the sea, it carries more water than any other river in the world. In some places, the Amazon is so wide that people standing on one bank cannot see the other side. During the rainy season, the river rises and floods huge areas of forest. Fish swim between the trunks of trees, eating fruits and seeds that fall into the water. The river is home to pink dolphins, giant otters, and turtles, as well as many kinds of fish that live nowhere else. For the people who live along its banks, the Amazon is a road, a market, and a source of food. Protecting the river means protecting the forest, because each one depends on the other to survive.",
  },
  {
    id: "grandpas-bicycle",
    idioma: "en",
    ano: 5,
    titulo: "Grandpa's bicycle",
    corpo:
      "In the back of Grandpa's garage, under a dusty sheet, Nina found an old blue bicycle. The tires were flat, the chain was covered in rust, and the bell no longer rang. Nina asked if she could ride it, and Grandpa laughed. He said it would need a lot of work first, but he was willing to help if she was patient. Every Saturday that spring, they worked on the bicycle together. Grandpa showed her how to patch the tires, clean the chain with an old toothbrush, and tighten the brakes so they would stop the wheels safely. Nina painted the frame a brighter blue and added a basket to the front. While they worked, Grandpa told stories about riding the same bicycle to school when he was her age, racing his friends down the hill. At last, on a warm morning in May, the bicycle was ready. Nina rode it slowly around the block while Grandpa watched from the porch. When she came back, she rang the shiny new bell just for him.",
  },
];

export function sortearTexto(idioma: Texto["idioma"], ano: number, excluir?: string, aleatorio: () => number = Math.random): Texto | undefined {
  const doAno = TEXTOS.filter((t) => t.idioma === idioma && t.ano === ano);
  const opcoes = doAno.length > 1 ? doAno.filter((t) => t.id !== excluir) : doAno;
  return opcoes[Math.floor(aleatorio() * opcoes.length)];
}
