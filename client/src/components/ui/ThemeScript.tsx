// Un petit script lancé avant l'affichage : il pose le thème choisi (gardé dans
// localStorage) sur <html>, pour éviter un flash du mauvais thème au chargement.
// Le sombre est le thème par défaut ; un choix enregistré reste prioritaire.
// Écrit en texte brut, car il s'exécute avant React.
const script = `try{var t=localStorage.getItem("theme");document.documentElement.dataset.theme=t==="light"?"light":"dark"}catch(e){}`;

export default function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
