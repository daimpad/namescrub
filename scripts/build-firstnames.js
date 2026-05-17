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
const VN = [
  'anh','bao','chi','cuong','duc','dung','ha','hai','hieu','hong',
  'hung','huy','khoa','lan','linh','loan','long','mai','minh','my',
  'nam','nga','ngoc','nguyen','nhan','phuong','quang','son','tam',
  'thao','thi','thien','thu','toan','trang','trung','tuan','tuyen','van',
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
]

mkdirSync(OUT_DIR, { recursive: true })
const unique = Array.from(new Set(ALL.map(n => n.toLowerCase()))).sort()
await writeFile(OUT_FILE, JSON.stringify(unique))

const kb = (JSON.stringify(unique).length / 1024).toFixed(1)
console.log(`First names built: ${unique.length.toLocaleString()} entries → ${OUT_FILE}`)
console.log(`File size: ~${kb} KB`)
