function onUpdatePost(elapsed)
    runHaxeCode([[
        function lerp(a,b,t){return a + (b-a) * t;}

		game.scoreTxt.x = game.healthBarBG.x + game.healthBarBG.width - 190;
        game.scoreTxt.y = game.healthBarBG.y + 30;
        game.scoreTxt.alignment = 'right';
        game.scoreTxt.fieldWidth = 0;
        //game.scoreTxt.size = 16;
        game.scoreTxt.text = 'Score: '+game.songScore;

        game.timeBar.visible = false;
        game.timeBarBG.visible = false;
        game.timeTxt.visible = false;

		game.healthBar.createFilledBar(0xFFFF0000, 0xFF66FF33);
		game.healthBar.updateBar();

		game.iconP1.setGraphicSize(lerp(game.iconP1.width, 150, FlxG.elapsed*18));
		game.iconP2.setGraphicSize(lerp(game.iconP2.width, 150, FlxG.elapsed*18));

        game.iconP1.updateHitbox();
        game.iconP2.updateHitbox();

        game.iconP1.y = (game.healthBar.y) - (80 * (150 / game.iconP1.width));
        game.iconP2.y = (game.healthBar.y) - (80 * (150 / game.iconP2.width));
        
    ]])
end

local wasHidden = false
function onCreatePost()
    wasHidden = getPropertyFromClass('ClientPrefs', 'ClientPrefs')
    setPropertyFromClass('ClientPrefs', 'hideHud', true)
end

function onDestroy()
    setPropertyFromClass('ClientPrefs', 'hideHud', wasHidden)
end

function onBeatHit()
    addHaxeLibrary('FlxMath', 'flixel.math')
    runHaxeCode([[

		//game.iconP1.scale.set(1.3, 1.3);
		//game.iconP2.scale.set(1.3, 1.3);

		game.iconP1.setGraphicSize(game.iconP1.width + 30);
		game.iconP2.setGraphicSize(game.iconP2.width + 30);

		game.iconP1.updateHitbox();
		game.iconP2.updateHitbox();
        
    ]])
end

local skr = 0
function goodNoteHit(membersIndex, noteData, noteType, isSustainNote)
    if isSustainNote then return end

    local ver = split(getPropertyFromClass('MainMenuState', 'psychEngineVersion'), '.')
    local pbRate = 1
    if tonumber(ver[2]) >= 6 and tonumber(ver[3]) >= 3 then
        pbRate = playbackRate
    end

    local note = {
        noteData = getPropertyFromGroup('notes', membersIndex, 'noteData');
        noteType = getPropertyFromGroup('notes', membersIndex, 'noteType');
        strumTime = getPropertyFromGroup('notes', membersIndex, 'strumTime');
    }
    local dif = (note.strumTime - getSongPosition() + getPropertyFromClass('ClientPrefs', 'ratingOffset'))
    local actDif = math.abs(dif)
    local daRating = runHaxeCode([[
        var note = game.notes["]]..tostring(membersIndex)..[["];
        var rating = Conductor.judgeNote(note, ]]..tostring(dif)..[[ / ]]..tostring(pbRate)..[[);
        return [rating.ratingMod, rating.score, rating.name, rating.image];
    ]])
    if type(daRating) ~= "table" then
        local ratt = "shit"
        if actDif <= 45 then
            ratt = "sick"
        elseif actDif <= 90 then
            ratt = "good"
        elseif actDif <= 135 then
            ratt = "bad"
        end
    
        daRating = {1, 350, ratt, ratt}
    end

    local seperatedScore = {}
    local combo = getProperty('combo')

    if combo >= 1000 then
        table.insert(seperatedScore, math.floor(combo / 1000) % 10)
    end
    table.insert(seperatedScore, math.floor(combo / 100) % 10)
    table.insert(seperatedScore, math.floor(combo / 10) % 10)
    table.insert(seperatedScore, combo % 10)

    local center = {getProperty('gf.x') + getProperty('gf.width')*0.5, getProperty('gf.y') + getProperty('gf.height')*0.2}

    skr = skr + 1
    local ratingSpr = 'ratingSpr'..tostring(skr)

    makeLuaSprite(ratingSpr, daRating[4], 0,0)
    setObjectCamera(ratingSpr, 'game')
    setScrollFactor(ratingSpr, getProperty('gf.scrollFactor.x'), getProperty('gf.scrollFactor.y'))
    setProperty(ratingSpr..'.acceleration.y', 550 * pbRate * pbRate)
    setProperty(ratingSpr..'.velocity.y', -(math.random(140, 175) * pbRate))
    setProperty(ratingSpr..'.velocity.x', -(math.random(0, 10) * pbRate))

    local scaleMult = math.floor(getProperty(ratingSpr..'.width') * 0.7)
    setGraphicSize(ratingSpr, scaleMult)
    updateHitbox(ratingSpr)

    setProperty(ratingSpr..'.x', center[1])
    setProperty(ratingSpr..'.y', center[2])

    setProperty(ratingSpr..'.antialiasing', getPropertyFromClass('ClientPrefs', 'globalAntialiasing'))

    addLuaSprite(ratingSpr, true)

    local daLoop = 0
    for i, v in pairs(seperatedScore) do

        local comboName = 'combo'..tostring(i)
        makeLuaSprite(comboName, 'num'..tostring(math.floor(v)), 0, 0)
        setObjectCamera(comboName, 'game')
        setProperty(comboName..'.acceleration.y', math.random(200,300) * pbRate * pbRate)
        setProperty(comboName..'.velocity.y', -(math.random(140,160) * pbRate))
        setProperty(comboName..'.velocity.x', math.random(-5,5) * pbRate)

        setGraphicSize(comboName, math.floor(getProperty(comboName..'.width') * 0.5))
        updateHitbox(comboName)

        addLuaSprite(comboName, true)

        setProperty(comboName..'.x', center[1] + (43 * daLoop) - 90)
        setProperty(comboName..'.y', center[2] + 80)

        setProperty(comboName..'.antialiasing', getPropertyFromClass('ClientPrefs', 'globalAntialiasing'))

        runTimer('sprAlpha-'..comboName, crochet * 0.002 / pbRate)

        daLoop = daLoop + 1
    end

    runTimer('sprAlpha-'..ratingSpr, crochet * 0.002 / pbRate)
end

function onTimerCompleted(tag, loops, loopsLeft)
    if split(tag, '-')[1] == "sprAlpha" then
        doTweenAlpha(split(tag, '-')[2].."-fadeDestroy", split(tag, '-')[2], 0, 0.2, 'linear')
    end
end

function onTweenCompleted(tag)
    if split(tag, '-')[2] == "fadeDestroy" then
        removeLuaSprite(split(tag, '-')[1], true)
    end
end

function split(str, sep)
    if sep == nil then
        sep = "%s"
    end
    local t = {}
    for str in string.gmatch(str, "([^"..sep.."]+)") do
        table.insert(t, str)
    end
    return t
end