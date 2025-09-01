export function registerStageLuaFunctions(L) {
  const lua = fengari.lua;
  const lauxlib = fengari.lauxlib;
  const to_luastring = fengari.to_luastring;

  // ✅ makeLuaSprite(name, path, x, y)
  lua.lua_pushjsfunction(L, function(L) {
    const name = fengari.to_jsstring(lua.lua_tostring(L, 1));
    const path = fengari.to_jsstring(lua.lua_tostring(L, 2));
    const x = lua.lua_tointeger(L, 3);
    const y = lua.lua_tointeger(L, 4);

    const img = new Image();
    img.src = path;
    img.onload = () => console.log("✅ Imagen cargada:", path);
    img.onerror = () => console.error("❌ No se pudo cargar:", path);

window.luaSprites[name] = {
  img: img,
  x: x,
  y: y,
  width: img.width,
  height: img.height,
  visible: false // solo se dibujará si se llama addLuaSprite
};

    return 0;
  });
  lua.lua_setglobal(L, to_luastring("makeLuaSprite"));

  // ✅ setProperty(name, property, value)
  lua.lua_pushjsfunction(L, function(L) {
    const name = fengari.to_jsstring(lua.lua_tostring(L, 1));
    const prop = fengari.to_jsstring(lua.lua_tostring(L, 2));
    const value = fengari.to_jsstring(lua.lua_tostring(L, 3));

    const sprite = window.luaSprites[name];
    if (!sprite) return 0;

    if (prop === "width") sprite.width = parseInt(value);
    if (prop === "height") sprite.height = parseInt(value);
    if (prop === "x") sprite.x = parseInt(value);
    if (prop === "y") sprite.y = parseInt(value);
    return 0;
  });
  lua.lua_setglobal(L, to_luastring("setProperty"));

  // Agrega esto dentro de registerStageLuaFunctions()
lua.lua_pushjsfunction(L, function(L) {
  const name = fengari.to_jsstring(lua.lua_tostring(L, 1));

  const sprite = window.luaSprites[name];
  if (!sprite) return 0;

  sprite.visible = true; // Marca que sí debe dibujarse

  return 0;
});
lua.lua_setglobal(L, to_luastring("addLuaSprite"));

}
