/*
  Help lines: one short sentence per build step, shown under the scene (bottom left).
  They say what the picture can't: the concept, the benefit or the problem.
  null = no line on that step. Keep them short and concrete; never restate the picture.
*/
export const HELP = {
  'md-files': [
    'Samme oppgave, tre oppsett av instruksjonsfiler.',
    '0 filer: hver session starter blankt. Den gjetter.',
    '1 fil: alt leses hver gang. Dyrt, og én utdatert linje styrer.',
    'Flere filer: den leser bare det oppgaven trenger.',
    'Neste session fortsetter fra STATUS og HANDOFF.',
    'Utdatert STATUS sender sessionen tilbake til ferdig arbeid.',
    'Derfor er oppdatering av filene en del av oppgaven.',
  ],
  spec: [
    'En HTML-spec som AI-en oppdaterer selv mens den jobber.',
    'Hver oppgave sier hvorfor den er blokkert, og hva den venter på.',
    'Et skjult lag med regler som bare agentene leser.',
    'Status til andre er ett klikk unna.',
    'Denne presentasjonen har sin egen.',
  ],
  'full-scope': [
    'Ett krav om gangen: hver løsning bygger på den forrige.',
    'Nye krav lappes på det som allerede står.',
    'Lappene må bære hverandre.',
    'Til slutt kaller den noe som ikke henger sammen for ferdig.',
    'Alle krav i én prompt: kjernen designes for hele omfanget.',
    'Samme krav, én ren konstruksjon, og færre tokens.',
    'Endres omfanget sent, er det kjernen som sprekker.',
  ],
  planning: [
    'Én og én: hver ny oppgave river opp noe som er bygget.',
    'Hele produktspecen først. Bare produktvalg kommer til deg.',
    'Så bygges alt i riktig rekkefølge, én gang.',
  ],
  goal: [
    'Du dikterer hver tekniske beslutning.',
    'Den følger stegene dine, også når de er feil.',
    'Beskriv kravet: den finner løsninger du ikke kjente til, eller tenkte på.',
  ],
  'visual-ref': [
    'Fire ord i prompten. Bildet i hodet ditt følger ikke med.',
    'Alle krav er krysset av. Det ligner bare ikke.',
    'Med et bilde treffer den nesten det du så for deg.',
    'Ekte referanser: hele huset, og detaljene hver for seg.',
    'Resultatet i spillet ligger tett på referansen.',
  ],
  show: [
    'Ord blir tolket. Den fikser noe, bare ikke det du mente.',
    'Et skjermbilde med en sirkel er entydig.',
    'Vanskelig å forklare? En fersk agent gjør bildet om til prompts.',
  ],
  kitchen: [
    'Én session gjør alt i rekkefølge. Køen vokser.',
    'Én session per oppgave. Hovedsessionen vet hvem som venter.',
    'Du svarer der det trengs. Resten jobber parallelt.',
  ],
  helpers: [
    'Hovedsessionen gjør jobben selv. Den har hele konteksten.',
    'Hjelpere passer til research: kort oppdrag, raskt svar.',
    'Gir du den hele jobben, kan den bli ferdig uten å si fra.',
    'Da må noen gå og lete.',
  ],
  watchdog: [
    'Sjekk hvert 10. minutt holder sessionene i gang over natta.',
    'Låst: to sessions venter på hverandre.',
    'Inaktiv: en session har stoppet uten å si fra.',
    'RAM-lås: ny jobb venter, ferdige jobber holder minnet.',
    'Auto-compact ved 400k i stedet for en ny session.',
    'Hjelperen er ferdig, men har ikke meldt fra.',
    'Om morgenen er jobben gjort.',
  ],
  remote: [
    'Uten varsel står jobben stille til du tilfeldigvis sjekker.',
    'Med varsel tar en beslutning sekunder, uansett hvor du er.',
    'I skyen fortsetter den, selv med laptopen lukket.',
  ],
  'always-working': [
    'Bivirkningen av sessions som alltid sier fra.',
    null, null, null, null, null, null,
    'Bestem selv når du svarer.',
  ],
  'self-check': [
    'Du som kontrollør: hver runde venter på deg.',
    'Den tester selv. Du sjekker bare det den ikke kan bekrefte.',
  ],
  fails: [
    'Lange sessions lapper gjerne symptomer.',
    '«Fikset!» uten at den har sjekket.',
    'Hver lapp gjør sessionen lengre og konteksten tyngre.',
    'Lappene skaper nye feil andre steder.',
    'Ny session, spør om årsaken: én linje, lappene kan fjernes.',
  ],
  effort: [
    'Medium: rask, stødig, ferdig.',
    'Mer effort tviler på det som var bra, og bruker mer tokens.',
  ],
  gateway: [
    'Et annet team leverer. Hva betyr det for deg?',
    'AI-en leser hver build og sier hva som kan bygges nå.',
    'Ingenting relevant? Da slipper du å lese den.',
    'Du leser tavla, ikke changelogene.',
    'AI-en sjekket gateway-koden før vi bygde mot designet.',
  ],
  'know-a-guy': [
    'Jobben lærer deg én del av kartet.',
    'Hvert sideprosjekt viser deg noe som finnes.',
    'Da blir du den folk spør. Om nesten alt.',
  ],
  projects: [
    'Plantegning til 3D-hjem, rett i nettleseren.',
    'En vanlig webapp med innlogging og deling.',
    'Ekte smarthjem-enheter styrt fra 3D-modellen.',
  ],
  'side-quest': [
    'Spillet trenger noe som ikke finnes.',
    'Så det bygges, og spillet venter.',
    'Det nye prosjektet trenger også noe.',
    'Tre prosjekter, én utvikler.',
    'Hvert sideprosjekt blir større enn behovet.',
    'Sideprosjektet ble et produkt.',
    'Det opprinnelige prosjektet står på 80 %.',
    'Oppmerksomheten deles på alt.',
    null,
  ],
  'asset-loop': [
    'Claude skriver bestillinger i en delt fil.',
    'ChatGPT lager det som står, og legger det der Claude sa.',
    'Ingen kopiering mellom vinduer: fila er grensesnittet.',
    'Resultatet ligger ute på Fab.',
  ],
  prototypes: [
    'Fire ekte versjoner koster mindre enn ett møte om én.',
    'Du ser forskjellen i stedet for å diskutere den.',
    'Velg én, kast resten.',
  ],
  'html-deck': [
    'Et vanlig lysbilde kan vise bilder av ting.',
    'En nettside kan kjøre tingen.',
    'Alt er tekst, så AI-en kan skrive og endre alt.',
    'Prisen: alt må bygges selv.',
  ],
  takeaways: [null],
  validate: [
    'Fire spørsmål før du bruker en time på å bygge.',
    'Uten en konkret kunde finnes det ingen idé.',
    'Betaler de allerede for noe lignende, er det et godt tegn.',
    'Mange tilbydere er greit. Se etter det ingen gjør.',
    'Kan du levere, og lønner det seg hele året?',
    'AI gjør hele verdikjeden billig. Derfor blir det trangt.',
  ],
  launch: [
    'Ferdig er ikke solgt. Butikksiden må lages.',
    'Teksten skrives fra det som faktisk er i pakken.',
    'Bildene selger pakken før noen har åpnet den.',
    'Prisen settes etter hva lignende pakker koster.',
    'Publisert, og den selger.',
  ],
  'ready-to-build': [
    'Planen er ferdig.',
    'Nå starter vi på første del av produktet.',
  ],
  opening: [
    'Det startet med et ønske om å få ett prosjekt i mål.',
    '15 prosjekter senere er 1 av dem i mål, og 14 nær målstreken.',
  ],
};
