export async function loadLogoAtlas(xmlPath) {
  const res = await fetch(xmlPath);
  const text = await res.text();
  const parser = new DOMParser();
  const xml = parser.parseFromString(text, "application/xml");

  const atlas = {};
  const elements = xml.getElementsByTagName("SubTexture");

  for (const el of elements) {
    const name = el.getAttribute("name");
    atlas[name] = {
      x: parseInt(el.getAttribute("x")),
      y: parseInt(el.getAttribute("y")),
      width: parseInt(el.getAttribute("width")),
      height: parseInt(el.getAttribute("height")),
    };
  }

  return atlas;
}
