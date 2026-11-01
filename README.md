# De Nieuwe Vaart

Website van de Nieuwe Vaart, waterscouting voor meiden van 11 tot en met 14 jaar bij Scouting VaDeDo in Leiderdorp.
Gehost als Static Site op Render (nieuwevaart.onrender.com). Losse pagina's (index, spullen, kampen, paklijst, zeilen, lid-worden, contact) met gedeelde style.css en script.js.

## Agenda
De agenda's (Socie, iCal) staan in `agenda-instellingen.js`. De site haalt ze live op; lukt dat niet,
dan gebruikt hij `agenda.json`. Die wordt elk uur ververst door de GitHub-workflow
`.github/workflows/agenda.yml` (handmatig starten kan via Actions > Agenda verversen > Run workflow).

## Wiki
Vloot (WSA-pagina), Kaagcup-prijzen (Kampen), geschiedenis (Lid worden) en de pagina Voor leiding komen
live van wiki.vadedo.nl. Welke pagina's waar staan, regel je in `wiki-instellingen.js`.
Terugval: `wiki.json`, elk uur ververst door dezelfde GitHub-workflow.

## Decor en stijl
Het bewegende water (boot 1798, eilandje met tentjes, eenden, dag naar nacht met toplicht) staat in `scene.js`
en wordt getekend op `<canvas id="decor">`. Op de homepage loopt de tijd mee met het scrollen,
op de andere pagina's volgt hij de echte tijd in Leiderdorp. Klik op de boot en hij gaat overstag.
Testen op een vast tijdstip: zet `?tijd=0.8` achter het adres (0 = middag, 1 = nacht).
Bezoekers kunnen via "Eenvoudige weergave" het decor uitzetten; bij "minder beweging" staat het stil.
Lettertypen (Montserrat en Instrument Serif) staan in `fonts/`.
