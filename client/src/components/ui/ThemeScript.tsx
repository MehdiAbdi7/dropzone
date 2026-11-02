// Un petit script lancé avant l'affichage : il pose le thème choisi (gardé dans
// localStorage) sur <html>, pour éviter un flash du mauvais thème au chargement.
// Le clair est le thème par défaut : seul un choix « dark » enregistré le change.
// Écrit en texte brut, car il s'exécute avant React.
const script = `try{var t=localStorage.getItem("theme");document.documentElement.dataset.theme=t==="dark"?"dark":"light"}catch(e){}`;

export default function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
