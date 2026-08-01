#!/usr/bin/env node
/**
 * Builds public/firstnames.json — a curated set of first names covering
 * German, Austrian, Swiss, and the major immigrant communities in Germany.
 * Kept as a static list for reliability (no external dependency at build time).
 */

import { mkdirSync } from 'fs'
import { writeFile } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT_DIR = path.join(ROOT, 'public')
const OUT_FILE = path.join(OUT_DIR, 'firstnames.json')

// ── German / Austrian / Swiss first names ────────────────────────────────────
const DE_MALE = [
  'aaron','adam','adrian','albert','alexander','alfred','alois','andreas','anton',
  'armin','axel','benedikt','benjamin','bernd','björn','burkhard','carsten','christian',
  'christoph','clemens','daniel','david','dennis','dieter','dietrich','dominik',
  'edgar','egon','emmanuel','erich','ernst','fabian','felix','ferdinand','florian',
  'frank','franz','frederic','frederik','friedrich','fritz','gabriel','georg',
  'gerhard','gerold','gert','gilbert','gottfried','gregor','günter','günther',
  'hannes','hans','harold','hartmut','heinrich','helmut','hendrik','herbert',
  'herman','hermann','holger','horst','hubert','igor','ingo','jacob','jakob',
  'jan','jens','jochen','joel','johannes','jonas','jonathan','jörg','jörn',
  'josef','julian','julius','jürgen','kai','karl','kaspar','kevin','kilian',
  'Klaus','konrad','konstantin','lars','leon','leonhard','lorenz','lothar',
  'luca','lucas','lukas','lutz','manfred','manuel','marc','marco','mario',
  'markus','martin','mathias','matthias','max','maximilian','michael','moritz',
  'nico','nicolas','nikolai','nikolaus','norbert','oliver','oskar','otto',
  'pascal','patrick','paul','peter','philipp','rainer','ralf','ralph','raphael',
  'reinhard','richard','robert','roland','rolf','roman','ruben','rudolf',
  'samuel','sebastian','siegfried','simon','stefan','stephan','sven','thomas',
  'thorsten','tim','tobias','tom','uwe','valentin','viktor','volker','walter',
  'werner','wilfried','wilhelm','winfried','wolf','wolfang','wolfgang',
]

const DE_FEMALE = [
  'adriane','agnes','alexandra','alice','alina','alisa','amalia','amanda','amelie',
  'andrea','angela','angelika','anke','anna','annabell','annamaria','anne','annegret',
  'annette','annika','antje','antonia','anuschka','astrid','barbara','beatrice',
  'beate','bianca','birgit','brigitte','carolin','carolina','caroline','catharina',
  'charlotte','christa','christel','christine','christina','claudia','corina',
  'cornelia','dana','daniela','diana','dorothea','edith','elisa','elke',
  'ella','ellen','elsa','else','elvira','emilia','emma','erika','evelyn',
  'franziska','frieda','gabi','gabriele','gerlinde','gertraud','gertrude',
  'hannelore','heidi','heike','helene','helga','hildegard','hilde','ilona',
  'ilse','ines','ingrid','inka','irene','iris','jana','jasmin','jennifer',
  'jessica','johanna','judith','julia','juliane','karen','karin','katarina',
  'katharina','kathrin','katja','katrin','katrina','kirsten','kirstin','klara',
  'kristin','lara','laura','lea','lena','leonie','lilli','lina','lisa',
  'lore','lotte','luisa','luise','madeleine','magdalena','maja','margit',
  'maria','marianne','marie','marina','marlene','martina','mechthild','michaela',
  'michelle','miriam','monika','nadia','nadja','natalie','nicole','nina',
  'petra','rahel','rebecca','regine','renate','rosemarie','sabine','sabrina',
  'sandra','sarah','selina','silke','silvia','simone','sonja','sophia','sophie',
  'stefanie','stella','susanne','tanja','tina','ulrike','ursula','uta',
  'veronika','victoria','waltraud','yvonne',
]

// ── English / American names (very common in German texts) ───────────────────
const EN_MALE = [
  'adam','alan','alex','andrew','anthony','austin','benjamin','brandon','brian',
  'bruce','cameron','charles','christopher','colin','craig','daniel','david',
  'derek','dominic','dylan','edward','eric','ethan','evan','george','henry',
  'jack','jacob','james','jason','john','jonathan','joseph','joshua','justin',
  'kevin','kyle','liam','luke','mark','matthew','michael','nathan','nicholas',
  'noah','oliver','oscar','patrick','paul','peter','philip','richard','robert',
  'ryan','samuel','scott','sean','simon','stephen','steven','thomas','timothy',
  'tyler','victor','william',
]

const EN_FEMALE = [
  'alice','amber','amy','ashley','catherine','charlotte','claire','diana',
  'elizabeth','emily','emma','eva','fiona','grace','hannah','helen','isabella',
  'jane','jennifer','jessica','julia','kate','katherine','lauren','lily','linda',
  'lisa','lucy','madison','mary','megan','melissa','mia','michelle','natalie',
  'olivia','rachel','rebecca','rose','ruby','sarah','sophie','stephanie','susan',
  'victoria','wendy','zoe',
]

// ── French names ──────────────────────────────────────────────────────────────
const FR_MALE = [
  'adrien','alexis','baptiste','benoit','charles','clement','cyril','david',
  'edouard','emile','etienne','florent','francois','gabriel','guillaume',
  'hugo','jean','julien','kevin','luc','lucas','marc','martin','maxime',
  'nicolas','olivier','pascal','paul','philippe','pierre','quentin','raphael',
  'remi','renaud','sebastien','stephane','thomas','vincent','xavier',
]

const FR_FEMALE = [
  'alice','amelie','anais','aurelie','camille','caroline','charlotte','claire',
  'chloe','elise','emilie','eva','florence','helene','ingrid','isabelle',
  'julie','juliette','laetitia','laura','laure','lea','lucie','luise',
  'manon','margot','marine','mathilde','nathalie','noemie','pauline','sabine',
  'sarah','sevrine','sophie','stephanie','valerie','virginie',
]

// ── Turkish names (large community in Germany) ────────────────────────────────
const TR_MALE = [
  'ahmet','ali','aydin','baris','burak','cem','emir','emre','enes','ercan',
  'erhan','erkan','fuat','furkan','halil','hasan','huseyin','ibrahim','ilhan',
  'ismail','kemal','kenan','kiran','mahmut','mehmet','murat','mustafa','nuri',
  'oguz','oktay','omar','onur','osman','ramazan','recep','salih','sercan',
  'serdar','sinan','tariq','tolga','umut','volkan','yilmaz','yusuf',
]

const TR_FEMALE = [
  'aysegul','ayse','arzu','bahar','beste','burcu','ceyda','derya','dilek',
  'dilnoza','ebru','elif','emine','esra','fatma','gonul','gul','gulsen',
  'hatice','hulya','ipek','irem','kader','leyla','merve','meryem','nergis',
  'nilay','nuray','nurcan','ozge','ozlem','pinar','seda','seher','selin',
  'semra','serap','sevgi','sibel','songul','tugba','tulay','tülay','vildan',
  'yasemin','zehra','zeynep',
]

// ── Polish names ──────────────────────────────────────────────────────────────
const PL_MALE = [
  'adam','aleksander','andrzej','bartosz','bogdan','damian','daniel','dawid',
  'grzegorz','jacek','jakub','jan','jaroslaw','kamil','krzysztof','lukasz',
  'maciej','marcin','marek','michal','mikolaj','pawel','piotr','rafal',
  'robert','sebastian','stanislaw','tomasz','waldemar','wojciech','zbigniew',
]

const PL_FEMALE = [
  'agata','agnieszka','aleksandra','alicja','anna','barbara','beata',
  'dagmara','dominika','ewa','gosia','ilona','joanna','julia','justyna',
  'karolina','katarzyna','klaudia','lidia','luiza','magdalena','malwina',
  'maria','marta','monika','natalia','nicole','patrycja','paulina','renata',
  'sylwia','weronika','zofia',
]

// ── Russian / Eastern European names ─────────────────────────────────────────
const RU_MALE = [
  'aleksander','aleksej','alexei','andrej','boris','denis','dmitri','evgeni',
  'fjodor','grigorij','igor','ilya','ivan','konstantin','maxim','mikhail',
  'nikita','nikolai','oleg','pavel','peter','roman','ruslan','sergei',
  'sergej','timofej','vadim','viktor','vladislav','wjatscheslaw','yuri',
]

const RU_FEMALE = [
  'alexia','alina','anastasia','anna','daria','elena','galina','irina',
  'ksenia','larisa','lidia','ludmila','marina','nadja','natalia','natascha',
  'natalja','nina','olga','polina','sofia','svetlana','tatjana','vera',
  'victoria','yana','yekaterina',
]

// ── Italian names ─────────────────────────────────────────────────────────────
const IT_MALE = [
  'alessio','andrea','antonio','carlo','davide','edoardo','emanuele',
  'enrico','fabio','federico','filippo','franco','giacomo','giancarlo',
  'giovanni','giuseppe','luca','luigi','marco','mario','matteo','michele',
  'nicola','roberto','salvatore','simone','stefano','tommaso','vincenzo',
]

const IT_FEMALE = [
  'alessia','alice','angela','anna','arianna','benedetta','bianca','carlotta',
  'chiara','claudia','elena','eleonora','elisa','emanuela','federica',
  'francesca','giulia','ilaria','irene','laura','lucia','luisa','maria',
  'marta','martina','michela','paola','roberta','sara','silvia','valentina',
]

// ── Arabic / Middle Eastern names ─────────────────────────────────────────────
const AR_MALE = [
  'abdallah','abdulrahman','adnan','ahmad','ahmed','ali','amir','anas',
  'bilal','faisal','hamid','hamza','hassan','hosein','hussein','ibrahim',
  'ismail','karim','khaled','mahmoud','malia','mehdi','mohamad','mohammad',
  'mohammed','murad','mustafa','nabil','omar','osama','osman','rami',
  'salem','samir','sami','tarek','tariq','walid','yasser','youssef',
]

const AR_FEMALE = [
  'aisha','alaa','amira','asma','dina','fatima','hana','hanan','hiba',
  'hind','houda','laila','leila','lina','maryam','mariam','nadia','noor',
  'nora','rahel','rania','rim','salma','samira','sana','sara','yasmin',
  'zahra','zainab',
]

// ── Greek names ───────────────────────────────────────────────────────────────
const GR_MALE = [
  'alexandros','anastasios','apostolos','athanasios','christos','dimitri',
  'dimitrios','evangelos','georgios','giorgos','ioannis','konstantinos',
  'kostas','michalis','nikos','panagiotis','paraskevas','petros','spyridon',
  'stavros','stelios','theodoros','vasilis','yannis',
]

const GR_FEMALE = [
  'aikaterini','angeliki','christina','dimitra','elena','eleni','georgia',
  'katerina','konstantina','maria','marina','niki','panagiota','sofia','vasiliki',
]

// ── Vietnamese names (growing community) ─────────────────────────────────────
// NOTE: 'mai' (month) and 'dung' (German noun) removed — they caused
// false positives on every capitalised occurrence ("Im Mai 2024 …").
const VN = [
  'anh','bao','chi','cuong','duc','hai','hieu','hong',
  'hung','huy','khoa','lan','linh','loan','long','minh',
  'nam','nga','ngoc','nguyen','nhan','phuong','quang','son','tam',
  'thao','thi','thien','thu','toan','trang','trung','tuan','tuyen','van',
]

// ── Extension 2026: broader coverage per community ───────────────────────────
// Rules: no German dictionary nouns, no month names, minimum 3 letters —
// every entry here fires as a name on ANY capitalised occurrence.

const DE_MALE_EXT = [
  'achim','adalbert','albrecht','alfons','arne','arnold','arno','arthur','artur',
  'balthasar','bastian','benno','berthold','bernhard','bodo','boris','bruno',
  'carl','caspar','cedric','claas','claus','constantin','cornelius','curt',
  'detlef','detlev','diethard','dietmar','dirk','eberhard','eckart','eckhard',
  'edmund','eduard','edwin','elias','emil','engelbert','enno','erhard','erik',
  'erwin','eugen','falk','falko','fiete','fridolin','friedhelm','fynn',
  'gereon','gernot','gottlieb','guido','gunnar','gunther','gustav','hagen',
  'hanno','hansi','harald','hasso','heiko','heiner','heinz','hellmut','henning',
  'henri','henry','hinrich','hugo','ingolf','jannik','jannis','jano','jaro',
  'jasper','joachim','johann','joscha','joseph','jost','junis','jupp','justus',
  'karlheinz','karsten','kay','klaas','knut','korbinian','kunibert','kurt',
  'lasse','laurenz','lennard','lennart','lenny','leo','leopold','levi','levin',
  'liam','linus','lio','lion','ludger','magnus','maik','mailo','malte','marcel',
  'marek','marius','marlon','mats','matteo','mattis','meik','mika','mikail',
  'milan','milo','mio','mirko','nepomuk','nick','niclas','niels','niklas',
  'nils','noah','norwin','ole','ottmar','ottokar','paulus','pepe','phil',
  'piet','pit','raik','raimund','rainald','reiner','reinhold','rene','rochus',
  'rüdiger','ruprecht','rutger','sascha','severin','siegbert','sigmund',
  'silvester','sönke','steffen','sylvester','theo','theodor','thies','thilo',
  'thoralf','thore','till','timon','timo','tino','titus','tjark','torben',
  'torge','torsten','udo','ulf','ulrich','urban','veit','vincent','vinzenz',
  'volkmar','wendelin','wenzel','wieland','wigbert','willi','willy','wim',
  'wolfram','xaver','yannick','yannik',
]

const DE_FEMALE_EXT = [
  'adelheid','agnes','almut','aloisia','amalia','amalie','amelie','anette',
  'angelika','anica','anina','anja','anke','annegret','annelie','anneliese',
  'annemarie','annett','annette','anni','annika','antje','antonia','ariane',
  'astrid','aurelia','babett','babette','bärbel','beate','berta','bertha',
  'bettina','birgit','birte','brigitta','brigitte','britta','carla','carlotta',
  'carolin','caroline','celina','christa','christel','christiane','christin',
  'christina','christine','cordula','corinna','dagmar','dana','daniela',
  'dorothea','dorothee','edeltraud','edith','elfriede','elisabeth','elke',
  'ella','ellen','elli','elsa','elsbeth','else','emilia','emmi','emmy',
  'enie','enna','felicitas','femke','fenja','finja','franka','franziska',
  'freya','frieda','friederike','friedl','gabriela','gabriele','gerda',
  'gerlinde','gertraud','gertrud','gesa','gesine','gisela','greta','gretel',
  'gudrun','hanna','hannah','hannelore','hedda','hedwig','heidemarie','heidi',
  'heike','helene','helga','henriette','henrike','herta','hertha','hilde',
  'hildegard','ilka','ilse','imke','ina','ines','inga','ingeborg','inge',
  'ingrid','irene','irina','irmgard','irmtraud','isabel','isabell','isabella',
  'isolde','jana','janin','janina','janne','jasmin','jette','johanna','jorina',
  'josefine','josephine','judith','jule','jutta','karin','karla','karola',
  'katharina','käthe','kathrin','katja','katrin','kerstin','kira','klara',
  'kornelia','kriemhild','kunigunde','lara','laura','lea','leandra','lene',
  'leni','leonie','leonore','liane','lieselotte','lilli','lilly','lina',
  'linda','lisbeth','liselotte','lotta','lotte','luise','lydia','madita',
  'magdalena','maike','malin','manuela','mareike','margarete','margarethe',
  'margit','margot','margret','marianne','marie','marieke','marion','marita',
  'marlene','marlies','martha','mathilde','mechthild','meike','melanie',
  'merle','meta','mia','michaela','mila','milena','mira','miriam','monika',
  'nadine','nele','nicole','nina','nora','norina','ortrud','ottilie','paula',
  'paulina','pauline','petra','pia','rebekka','regina','regine','renate',
  'ricarda','romy','rosalie','rosemarie','roswitha','ruth','sabine','sabrina',
  'sandra','sarah','saskia','selma','sibylle','siegrid','sieglinde','sigrid',
  'silke','silvia','simone','sina','solveig','sonja','sophie','stefanie',
  'steffi','susanne','svenja','swantje','tabea','tanja','theresa','therese',
  'thordis','tilda','tina','traudel','trude','ulla','ulrike','ursel','ursula',
  'ute','uta','verena','vera','veronika','viktoria','waltraud','wiebke',
  'wilhelmine','yvonne',
]

const TR_EXT = [
  'abdullah','adem','ahmet','ali','alper','altan','arda','aslan','atilla',
  'aydin','ayhan','baran','baris','bekir','berat','berk','berkay','bilal',
  'bora','bülent','burak','burhan','can','celal','cem','cemal','cengiz',
  'cihan','coskun','davut','devrim','doruk','efe','ege','emin','emirhan',
  'ender','enes','engin','erdem','erdogan','erhan','erol','ersin','ertan',
  'faruk','fatih','ferhat','fikret','furkan','görkem','gökhan','hakan',
  'halil','haluk','hamza','hasan','hayri','hüseyin','ibrahim','ilhan',
  'ilker','irfan','ismail','ismet','kaan','kadir','kemal','kenan','kerem',
  'kerim','koray','levent','mahmut','mesut','metin','muhammed','murat',
  'mustafa','necati','nihat','nuri','okan','onur','orhan','osman','ozan',
  'ömer','özcan','özgür','ramazan','recep','resul','riza','sadik','salih',
  'savas','selim','serdar','serkan','sinan','soner','suat','süleyman',
  'talha','tamer','taner','tarik','tayfun','tolga','tuncay','turan','ugur',
  'umut','veli','volkan','yakup','yasin','yavuz','yildirim','yilmaz','yunus',
  'yusuf','zafer','zeki',
  'aleyna','asli','aylin','aysel','aysegül','ayse','azra','bahar','belgin',
  'berna','beyza','bilge','birgül','büsra','canan','cansu','ceren','ceyda',
  'defne','derya','dilan','dilara','dilek','duygu','ebru','ecrin','eda',
  'elanur','elif','emine','esra','fadime','fatma','feride','filiz','fidan',
  'gamze','gizem','gül','gülcan','güler','gülsüm','hacer','hatice','havva',
  'hilal','hülya','ilayda','irem','kadriye','kübra','lale','leyla','medine',
  'melek','melike','meltem','meryem','miray','nazli','nehir','nesrin','nur',
  'nurgül','özge','özlem','pelin','pinar','rabia','rukiye','sedef','selin',
  'semra','serap','sevgi','sevim','sibel','songül','sultan','tuba','tugce',
  'tülay','yasemin','zehra','zeynep','zuhal','zümra',
]

const AR_EXT = [
  'abdel','abdul','adel','adnan','ahmad','akram','amir','ammar','anas',
  'ayman','aziz','bashar','bassam','bilel','fadi','fahad','faisal','farid',
  'firas','ghassan','habib','haitham','hakim','hamid','hani','harun','hassan',
  'haytham','hussein','imad','issa','jamal','jawad','kamal','karim','khaled',
  'khalil','majid','malik','mansour','marwan','mazen','mohamad','mohamed',
  'mohammad','mohammed','mounir','mourad','muhammad','munir','nabil','nader',
  'nadim','naji','nasser','nizar','omar','osama','qasim','rachid','rafik',
  'ramzi','rashid','riad','sabri','said','salah','salam','saleh','salman',
  'samir','tarek','tariq','walid','wael','yahya','yasser','youssef','zaid',
  'zakaria','ziad',
  'abir','aisha','alia','amal','amina','amira','asma','aya','dalal','dalia',
  'dina','fadia','farah','fatima','fatme','ghada','hala','hana','hanan',
  'hiba','huda','iman','jamila','khadija','lamia','latifa','lina','maha',
  'maimuna','majida','malak','mariam','marwa','maya','maysa','mona','nadia',
  'nahla','najat','nawal','nour','rana','randa','rania','rasha','rima',
  'sahar','salma','samah','samia','sana','shaima','soraya','souad','sumaya',
  'wafa','yasmin','yasmina','zahra','zeinab',
]

const SLAV_EXT = [
  'aleksander','aleksandra','alena','aljoscha','anastasia','anatoli','andrej',
  'andrzej','aneta','aniela','antoni','arkadiusz','bartek','bartosz','bogdan',
  'bogumil','boguslaw','bozena','bronislaw','czeslaw','damian','danuta',
  'darek','dariusz','dawid','dorota','dmitri','dmitrij','edyta','elzbieta',
  'ewa','ewelina','filip','franciszek','gerasim','grazyna','grzegorz','halina',
  'hanka','henryk','honorata','ignacy','igor','ilja','iwan','iwona','izabela',
  'jacek','jadwiga','jagoda','jakub','janusz','jarek','jaroslaw','jerzy',
  'joanna','jolanta','jozef','julita','justyna','kamil','kamila','karol',
  'karolina','kasia','katarzyna','kazimierz','kinga','konstantyn','krystian',
  'krystyna','krzysztof','ksenia','kuba','lech','leszek','lucyna','ludmila',
  'lukasz','maciej','magda','malgorzata','marcin','marek','mariola','mariusz',
  'marta','marzena','mateusz','michal','mieczyslaw','mikolaj','milosz',
  'miroslaw','monika','natalia','nikodem','oksana','olga','pawel','piotr',
  'przemyslaw','radek','radoslaw','rafal','renata','roksana','ryszard',
  'sebastian','sergej','slawomir','stanislaw','stanislawa','stefania',
  'swetlana','sylwia','szymon','tadeusz','teresa','tomasz','urszula',
  'waclaw','waldemar','wanda','wieslaw','wiktor','wiktoria','witold',
  'wladyslaw','wojciech','zbigniew','zdzislaw','zofia','zuzanna',
  'aleksej','boris','fjodor','gennadi','grigori','iwanka','jekaterina',
  'jelena','jewgeni','kirill','konstantin','larissa','lew','ljudmila',
  'maksim','marija','michail','nadeschda','nastja','natascha','nikita',
  'nikolaj','oleg','pjotr','polina','raissa','ruslan','semjon','sergei',
  'stanislav','tamara','tatjana','timur','vadim','valentina','vitali',
  'wladimir','wsewolod','xenia','yuri',
  'ana','anka','bojan','borislav','branimir','danica','dejan','dragan',
  'dragana','dusan','goran','gordana','ivana','ivano','jasna','jovan',
  'jovana','ljubica','marko','milena','milica','milos','mirjana','nemanja',
  'nenad','nikola','novak','radmila','sasa','slavica','snezana','sonja',
  'stefan','svetlana','vesna','vlado','zeljko','zoran','zorica',
]

const ES_PT_EXT = [
  'alejandro','alfonso','alvaro','andres','antonio','carlos','cesar','diego',
  'eduardo','emilio','enrique','esteban','felipe','fernando','francisco',
  'gonzalo','guillermo','gustavo','hector','ignacio','javier','joaquin',
  'jorge','jose','juan','julio','luis','manolo','marcos','miguel','nicolas',
  'pablo','paco','pedro','rafael','ramon','raul','ricardo','roberto',
  'rodrigo','salvador','santiago','sergio','vicente',
  'adriana','alejandra','alicia','beatriz','carmen','catalina','consuelo',
  'cristina','dolores','elena','esperanza','estrella','eugenia','francisca',
  'gabriela','guadalupe','inmaculada','isabela','josefa','juana','julieta',
  'lourdes','lucia','luisa','manuela','marisol','mercedes','montserrat',
  'natalia','paloma','pilar','raquel','rocio','rosario','soledad','teresa',
  'valentina','veronica','ximena','yolanda',
  'afonso','duarte','goncalo','henrique','joao','nuno','tiago','vasco',
  'branca','filipa','ineza','madalena','mariana','matilde',
]

const FA_EXT = [
  'abbas','arash','ardashir','armin','arsalan','ashkan','babak','bahram',
  'behnam','behrang','behrouz','bijan','cyrus','dariush','darius','ehsan',
  'esfandiar','farhad','farzad','hamed','hooman','hossein','jamshid','kambiz',
  'kamran','kaveh','keyvan','khosrow','kian','kourosh','mehdi','mehran',
  'milad','navid','omid','parviz','pejman','peyman','pouya','ramin','reza',
  'rostam','saeed','shahin','shahram','siavash','sohrab',
  'anahita','arezoo','azadeh','bahar','banafsheh','elham','farideh','fereshteh',
  'golnaz','laleh','leila','mahnaz','mahsa','mandana','maryam','mina','mitra',
  'mojgan','narges','nasrin','nazanin','niloufar','parisa','parvaneh','roya',
  'sepideh','shirin','simin','soraya','yasaman','ziba',
]

const ASIA_EXT = [
  'akira','aiko','daiki','haruki','haruto','hina','hiro','hiroshi','kaito',
  'kenji','kenta','mao','miku','misaki','naoko','ren','rin','riku','sakura',
  'satoshi','shota','sora','takumi','taro','yui','yuki','yuma','yuna','yuto',
  'chen','cheng','feng','hua','jian','jing','juan','jun','lei','ling',
  'liu','mei','ming','ping','qing','rui','shan','tao','wei','xia','xiang',
  'xin','yan','yang','ying','yong','yun','zhen','zhi','zhong',
  'jae','jihoon','jimin','jisoo','joon','minho','minji','seojun','soyeon',
  'sungmin','yejin',
  'binh','dat','giang','hanh','hoa','hoang','khanh','kiet','ngan','nghia',
  'nhung','phat','phuc','quan','quynh','thang','thanh','tien','trinh','vinh',
]

const NL_SCAND_EXT = [
  'aart','bram','cees','daan','dirk','floris','geert','gijs','hendrik',
  'huub','jaap','jelle','joost','jurgen','kees','koen','lars','luuk',
  'maarten','matthijs','niek','pim','rik','ruud','sander','sjoerd','stijn',
  'teun','thijs','tijn','wouter',
  'anouk','famke','fleur','floor','janneke','lieke','lotte','maud','mirthe',
  'noor','roos','sanne','tess',
  'aksel','anders','arvid','asger','birger','bjarne','einar','erland','espen',
  'finn','frode','gunnar','halvor','haakon','ingvar','ivar','jesper','kjell',
  'leif','mads','mikkel','morten','nils','odin','olav','ole','oskar','ragnar',
  'rasmus','rune','sigurd','soren','sten','stig','sverre','tobias','torbjorn',
  'trygve','vidar',
  'agnetha','annika','astri','birgitta','bodil','dagny','ebba','elin',
  'gunhild','hedvig','hilda','ingela','kaisa','kajsa','karita','liv','maja',
  'malena','marit','ronja','sigrun','silje','solvei','synne','thea','tove',
  'tuva','ulrika','vigdis',
]

const EN_INTL_EXT = [
  'aaron','aidan','albert','alex','alfie','andrew','anthony','archie',
  'arthur','austin','ben','blake','bradley','brandon','brian','caleb',
  'callum','cameron','charles','charlie','christopher','cole','connor',
  'daniel','dean','dylan','edward','elliot','ethan','evan','ewan','finley',
  'freddie','gareth','gary','gavin','george','graham','grant','harry',
  'harvey','hayden','ian','isaac','jack','jackson','jake','james','jamie',
  'jason','jayden','jeremy','joe','john','jordan','joshua','jude','keith',
  'kenneth','kieran','kyle','lee','lewis','logan','louie','louis','luke',
  'mason','matthew','michael','nathan','neil','nigel','oliver','owen',
  'reece','rhys','riley','robin','ronald','rory','ross','ryan','scott',
  'sean','stephen','steven','stuart','taylor','teddy','theodore','trevor',
  'tyler','wayne','william','zack',
  'abigail','aimee','alice','amanda','amelia','amy','ashley','ava','bella',
  'beth','bethany','brooke','caitlin','charlotte','chloe','courtney','daisy',
  'demi','eleanor','eliza','elizabeth','ellie','eloise','emily','erin','esme',
  'evelyn','evie','faith','florence','freya','georgia','grace','hailey',
  'harper','harriet','hollie','holly','imogen','isla','ivy','jade','jasmine',
  'jennifer','jessica','jodie','kate','katie','kayleigh','keira','kelly',
  'lacey','lauren','leah','lexi','libby','lily','lucy','lydia','maisie',
  'megan','melissa','mollie','molly','naomi','niamh','olivia','phoebe',
  'poppy','rachel','rebecca','rosie','ruby','scarlett','shannon','skye',
  'stephanie','summer','tia','victoria','willow','zara','zoe',
]

// ── Merge all ─────────────────────────────────────────────────────────────────
const ALL = [
  ...DE_MALE, ...DE_FEMALE,
  ...EN_MALE, ...EN_FEMALE,
  ...FR_MALE, ...FR_FEMALE,
  ...TR_MALE, ...TR_FEMALE,
  ...PL_MALE, ...PL_FEMALE,
  ...RU_MALE, ...RU_FEMALE,
  ...IT_MALE, ...IT_FEMALE,
  ...AR_MALE, ...AR_FEMALE,
  ...GR_MALE, ...GR_FEMALE,
  ...VN,
  ...DE_MALE_EXT, ...DE_FEMALE_EXT,
  ...TR_EXT, ...AR_EXT, ...SLAV_EXT, ...ES_PT_EXT,
  ...FA_EXT, ...ASIA_EXT, ...NL_SCAND_EXT, ...EN_INTL_EXT,
]

mkdirSync(OUT_DIR, { recursive: true })
// Names whose German common-word usage outweighs their name usage — as
// list entries they would fire on ordinary capitalised words ("Nur wenige
// kamen", "an Silvester", "die Marine", "der Kader", "das Beste").
const BLOCKED = new Set([
  'nur', 'beste', 'silvester', 'sylvester', 'urban', 'sultan', 'kader',
  'emir', 'marine', 'amber', 'rose', 'iris', 'mark', 'ross', 'grant',
  'lee', 'floor', 'noor', 'summer', 'teddy', 'jade', 'espen', 'seher',
  'seda', 'salam', 'ping', 'tao', 'ren', 'lei', 'yang', 'xiang', 'phat',
  'chi',
])

// Minimum 3 letters — 2-char entries ("my", "ha") collide too easily.
const unique = Array.from(new Set(ALL.map(n => n.toLowerCase())))
  .filter(n => n.length >= 3 && !BLOCKED.has(n))
  .sort()
await writeFile(OUT_FILE, JSON.stringify(unique))

const kb = (JSON.stringify(unique).length / 1024).toFixed(1)
console.log(`First names built: ${unique.length.toLocaleString()} entries → ${OUT_FILE}`)
console.log(`File size: ~${kb} KB`)
