local totalTimeElapsedSinceStart = 0
local ogZoom = 0
local staticArrowWave = 0
local rotateDif = 20

local canDoCountdown = false
local bounceCam = false
local strumBoops = false

local l = false
local amplit = 0

local events = {}

local heySteps = {76,140,268,332,396,780,782}

local function lerp(a,b,t)
return a + (b-a) * t
end

local function getTimeFromStep(step)
    return ((step) / (curBpm / 60)/4);
end

local function strumsGoLeftAndRight()
    doTweenX("camOther left1", "camOther", -100, (stepCrochet*0.001) * 1.8, "QuintInOut")
end

local function strumRotationThing()
    doTweenAngle('stage1 angle1', 'camGame', -10, (stepCrochet*0.001) * 2, 'CircOut')
end

function addEvent(pos,func)
    events[pos] = {pos, func}
end

local skrrrr = true
function onCreatePost()
    addHaxeLibrary('Paths')
	addHaxeLibrary('OverlayShader')
	addHaxeLibrary('ColorSwap')
	addHaxeLibrary('WiggleEffectType', 'WiggleEffect')
	addHaxeLibrary('BlendMode', 'openfl.display')
	addHaxeLibrary('ShaderFilter', 'openfl.filters')
	addHaxeLibrary('FlxCamera', 'flixel')
	addHaxeLibrary('FlxMath', 'flixel.math')

    runHaxeCode([[
		wiggg = new WiggleEffect();

        susCam = new FlxCamera();
		susCam.bgColor = '#569677';
        arrowCam = new FlxCamera();
		arrowCam.bgColor = '#569677';

		FlxG.cameras.remove(game.camHUD, false);
		FlxG.cameras.remove(game.camOther, false);

		FlxG.cameras.add(susCam, false);
		FlxG.cameras.add(arrowCam, false);
		FlxG.cameras.add(game.camHUD, false);
		FlxG.cameras.add(game.camOther, false);
    ]])
    for i = 1,table.getn(heySteps) do
        addEvent(getTimeFromStep(heySteps[i]),function()
            runHaxeCode("game.boyfriend.playAnim('hey',true);game.boyfriend.specialAnim = true;")
            runTimer('heyEnd',getPropertyFromClass('Conductor', 'crochet')/1000)
        end)
    end


    function TweenReceptors(invFreq, amp, t)
        addEvent(t,function()
            for i = 0, 7 do
                local ogY = getPropertyFromGroup("strumLineNotes", i, "y")
                local ogX = getPropertyFromGroup("strumLineNotes", i, "x")
                setPropertyFromGroup("strumLineNotes", i, "y", ogY + math.sin(ogX / invFreq) * amp)
                noteTweenY('note im '..tostring(i), i, ogY, 0.2, "CircOut")
            end
        end)
    end
	function SetReceptors(invFreq, off, amp, t)
        addEvent(t,function()
            for i = 0, 7 do
                local ogY = getPropertyFromGroup("strumLineNotes", i, "y")
                local ogX = getPropertyFromGroup("strumLineNotes", i, "x")
                setPropertyFromGroup("strumLineNotes", i, "y", ogY + math.sin(ogX / invFreq + off) * amp)
            end
        end)
    end
	TweenReceptors(100, 50, 0);
	TweenReceptors(100, 50, .36);
	TweenReceptors(100, 50, .72);
	SetReceptors(80, 1, 30, .96);
	SetReceptors(60, 2, -30, 1.08);
	SetReceptors(50, 3, 30, 1.2);
	SetReceptors(40, 4, -30, 1.44);

    for z = 0,3 do
        addEvent(1.68 + z * 0.06,function()
            local alt = -1
            if z % 2 == 0 then alt = 1 end
            for i = 0, 7 do
                local ogY = getPropertyFromGroup("strumLineNotes", i, "y")
                local ogX = getPropertyFromGroup("strumLineNotes", i, "x")
                setPropertyFromGroup("strumLineNotes", i, "y", ogY + math.sin(ogX / 50 + 5 + z) * 40 * alt)
            end
        end)
    end
    addEvent(1.95,function()
        for i = 0, 7 do
            local ogY = defaultOpponentStrumY0
            noteTweenY('note ou '..tostring(i), i, ogY, 0.2, "CircOut")
        end
    end)


    addEvent(getTimeFromStep(16),function()
        bounceCam = true
    end)
    addEvent(11.75,strumsGoLeftAndRight)
    addEvent(15.6,strumsGoLeftAndRight)
    addEvent(42.50,strumsGoLeftAndRight)
    addEvent(46.32,strumsGoLeftAndRight)

    for b = 0,1 do
        for a = 0,1 do
            local nextMeasure = a * 7.68 + b * 30.72;
            addEvent(20.40 + nextMeasure,function()
                doTweenAngle('camGame angle1', 'camGame', -10, 0.2, 'CircOut')
                doTweenAngle('camNotes angle1', 'camOther', 10, 0.2, 'CircOut')
                for i =0,1 do
                    local strum0 = defaultOpponentStrumX0
                    local strum1 = defaultOpponentStrumX1
                    local strum2 = defaultOpponentStrumX2
                    local strum3 = defaultOpponentStrumX3
                    if i == 1 then
                        strum0 = defaultPlayerStrumX0
                        strum1 = defaultPlayerStrumX1
                        strum2 = defaultPlayerStrumX2
                        strum3 = defaultPlayerStrumX3
                    end
                    noteTweenX('note a 0-'..tostring(i), 0 + (4*i), strum0 + rotateDif, 0.2, "CircOut")
                    noteTweenX('note a 1-'..tostring(i), 1 + (4*i), strum1 + rotateDif/2, 0.2, "CircOut")
                    noteTweenX('note a 2-'..tostring(i), 2 + (4*i), strum2 - rotateDif/2, 0.2, "CircOut")
                    noteTweenX('note a 3-'..tostring(i), 3 + (4*i), strum3 - rotateDif, 0.2, "CircOut")
                end
            end)
            addEvent(20.64 + nextMeasure,function()
                doTweenAngle('camGame angle2', 'camGame', 10, 0.2, 'CircInOut')
                doTweenAngle('camNotes angle2', 'camOther', -10, 0.2, 'CircOut')
                for i =0,1 do
                    local strum0 = defaultOpponentStrumX0
                    local strum1 = defaultOpponentStrumX1
                    local strum2 = defaultOpponentStrumX2
                    local strum3 = defaultOpponentStrumX3
                    if i == 1 then
                        strum0 = defaultPlayerStrumX0
                        strum1 = defaultPlayerStrumX1
                        strum2 = defaultPlayerStrumX2
                        strum3 = defaultPlayerStrumX3
                    end
                    noteTweenX('note a 0-'..tostring(i), 0 + (4*i), strum0 - rotateDif, 0.2, "CircOut")
                    noteTweenX('note a 1-'..tostring(i), 1 + (4*i), strum1 - rotateDif/2, 0.2, "CircOut")
                    noteTweenX('note a 2-'..tostring(i), 2 + (4*i), strum2 + rotateDif/2, 0.2, "CircOut")
                    noteTweenX('note a 3-'..tostring(i), 3 + (4*i), strum3 + rotateDif, 0.2, "CircOut")
                end
            end)
            addEvent(20.88 + nextMeasure,function()
                doTweenAngle('camGame angle3', 'camGame', -10, 0.2, 'CircInOut')
                doTweenAngle('camNotes angle3', 'camOther', 10, 0.2, 'CircOut')
                for i =0,1 do
                    local strum0 = defaultOpponentStrumX0
                    local strum1 = defaultOpponentStrumX1
                    local strum2 = defaultOpponentStrumX2
                    local strum3 = defaultOpponentStrumX3
                    if i == 1 then
                        strum0 = defaultPlayerStrumX0
                        strum1 = defaultPlayerStrumX1
                        strum2 = defaultPlayerStrumX2
                        strum3 = defaultPlayerStrumX3
                    end
                    noteTweenX('note a 0-'..tostring(i), 0 + (4*i), strum0 + rotateDif, 0.2, "CircOut")
                    noteTweenX('note a 1-'..tostring(i), 1 + (4*i), strum1 + rotateDif/2, 0.2, "CircOut")
                    noteTweenX('note a 2-'..tostring(i), 2 + (4*i), strum2 - rotateDif/2, 0.2, "CircOut")
                    noteTweenX('note a 3-'..tostring(i), 3 + (4*i), strum3 - rotateDif, 0.2, "CircOut")
                end
            end)
            addEvent(21.12 + nextMeasure,function()
                doTweenAngle('camGame angle4', 'camGame', 0, 0.2, 'CircOut')
                doTweenAngle('camNotes angle4', 'camOther', 0, 0.2, 'CircOut')
                for i =0,1 do
                    local strum0 = defaultOpponentStrumX0
                    local strum1 = defaultOpponentStrumX1
                    local strum2 = defaultOpponentStrumX2
                    local strum3 = defaultOpponentStrumX3
                    if i == 1 then
                        strum0 = defaultPlayerStrumX0
                        strum1 = defaultPlayerStrumX1
                        strum2 = defaultPlayerStrumX2
                        strum3 = defaultPlayerStrumX3
                    end
                    noteTweenX('note a 0-'..tostring(i), 0 + (4*i), strum0, 0.2, "CircOut")
                    noteTweenX('note a 1-'..tostring(i), 1 + (4*i), strum1, 0.2, "CircOut")
                    noteTweenX('note a 2-'..tostring(i), 2 + (4*i), strum2, 0.2, "CircOut")
                    noteTweenX('note a 3-'..tostring(i), 3 + (4*i), strum3, 0.2, "CircOut")
                end
            end)
        end
    end

    addEvent(63.36,function() strumBoops = true; end)
    addEvent(63.2,function() strumSKRRRRR = true; end)

    ogZoom = getProperty("camGame.zoom")
    ogZoom2 = getProperty("camOther.zoom")
    addEvent(77.75,function()
        strumBoops = false;
    end)
    addEvent(78.31,function()
        doTweenAngle("cams1 spinny1", "camGame", -30, (crochet*0.001), "SineInOut")
        doTweenAngle("cams2 spinny1", "camOther", 30, (crochet*0.001), "SineInOut")
    end)
    addEvent(78.70,function()
        doTweenAngle("cams1 spinny2", "camGame", 360*4, (crochet*0.001)*7.9, "SineOut")
        doTweenAngle("cams2 spinny2", "camOther", -(360*4), (crochet*0.001)*7.9, "SineOut")
        runTimer("cam yuppi", ((crochet*0.001)*8)+0.1)
        doTweenZoom("cams zoomies1", "camGame", ogZoom*2, (crochet*0.001), "SineInOut")
    end)
    addEvent(79,function()
        doTweenZoom("cams zoomies2", "camGame", ogZoom, (crochet*0.001)*8, "SineOut")
    end)
    addEvent(82.52,function()
        setProperty("camOther.angle",0)
        setProperty("camGame.angle",0)
        strumBoops = true;
    end)

    for i = 1, 20 do
        addEvent(63.2 + (crochet/1000)*i,function()
            skrrrr = not skrrrr
            if middlescroll then
                if skrrrr then
                    noteTweenX('note skrr'..tostring(i)..' 0 ', 0, defaultOpponentStrumX0, 0.44, "SineInOut")
                    noteTweenX('note skrr'..tostring(i)..' 1 ', 1, defaultOpponentStrumX1, 0.44, "SineInOut")
                    noteTweenX('note skrr'..tostring(i)..' 2 ', 2, defaultOpponentStrumX2, 0.44, "SineInOut")
                    noteTweenX('note skrr'..tostring(i)..' 3 ', 3, defaultOpponentStrumX3, 0.44, "SineInOut")
                    noteTweenX('note skrr'..tostring(i)..' 4 ', 4, defaultPlayerStrumX0, 0.44, "SineInOut")
                    noteTweenX('note skrr'..tostring(i)..' 5 ', 5, defaultPlayerStrumX1, 0.44, "SineInOut")
                    noteTweenX('note skrr'..tostring(i)..' 6 ', 6, defaultPlayerStrumX2, 0.44, "SineInOut")
                    noteTweenX('note skrr'..tostring(i)..' 7 ', 7, defaultPlayerStrumX3, 0.44, "SineInOut")
                else
                    noteTweenX('note skrr'..tostring(i)..' 0 ', 0, defaultOpponentStrumX3, 0.44, "SineInOut")
                    noteTweenX('note skrr'..tostring(i)..' 1 ', 1, defaultOpponentStrumX2, 0.44, "SineInOut")
                    noteTweenX('note skrr'..tostring(i)..' 2 ', 2, defaultOpponentStrumX1, 0.44, "SineInOut")
                    noteTweenX('note skrr'..tostring(i)..' 3 ', 3, defaultOpponentStrumX0, 0.44, "SineInOut")
                    noteTweenX('note skrr'..tostring(i)..' 4 ', 4, defaultPlayerStrumX3, 0.44, "SineInOut")
                    noteTweenX('note skrr'..tostring(i)..' 5 ', 5, defaultPlayerStrumX2, 0.44, "SineInOut")
                    noteTweenX('note skrr'..tostring(i)..' 6 ', 6, defaultPlayerStrumX1, 0.44, "SineInOut")
                    noteTweenX('note skrr'..tostring(i)..' 7 ', 7, defaultPlayerStrumX0, 0.44, "SineInOut")
                end
            else
                if skrrrr then
                    noteTweenX('note skrr'..tostring(i)..' 0 ', 0, defaultOpponentStrumX0, 0.44, "SineInOut")
                    noteTweenX('note skrr'..tostring(i)..' 1 ', 1, defaultOpponentStrumX1, 0.44, "SineInOut")
                    noteTweenX('note skrr'..tostring(i)..' 2 ', 2, defaultOpponentStrumX2, 0.44, "SineInOut")
                    noteTweenX('note skrr'..tostring(i)..' 3 ', 3, defaultOpponentStrumX3, 0.44, "SineInOut")
                    noteTweenX('note skrr'..tostring(i)..' 4 ', 4, defaultPlayerStrumX0, 0.44, "SineInOut")
                    noteTweenX('note skrr'..tostring(i)..' 5 ', 5, defaultPlayerStrumX1, 0.44, "SineInOut")
                    noteTweenX('note skrr'..tostring(i)..' 6 ', 6, defaultPlayerStrumX2, 0.44, "SineInOut")
                    noteTweenX('note skrr'..tostring(i)..' 7 ', 7, defaultPlayerStrumX3, 0.44, "SineInOut")
                else
                    noteTweenX('note skrr'..tostring(i)..' 0 ', 0, defaultPlayerStrumX3, 0.44, "SineInOut")
                    noteTweenX('note skrr'..tostring(i)..' 1 ', 1, defaultPlayerStrumX2, 0.44, "SineInOut")
                    noteTweenX('note skrr'..tostring(i)..' 2 ', 2, defaultPlayerStrumX1, 0.44, "SineInOut")
                    noteTweenX('note skrr'..tostring(i)..' 3 ', 3, defaultPlayerStrumX0, 0.44, "SineInOut")
                    noteTweenX('note skrr'..tostring(i)..' 4 ', 4, defaultOpponentStrumX3, 0.44, "SineInOut")
                    noteTweenX('note skrr'..tostring(i)..' 5 ', 5, defaultOpponentStrumX2, 0.44, "SineInOut")
                    noteTweenX('note skrr'..tostring(i)..' 6 ', 6, defaultOpponentStrumX1, 0.44, "SineInOut")
                    noteTweenX('note skrr'..tostring(i)..' 7 ', 7, defaultOpponentStrumX0, 0.44, "SineInOut")
                end
            end
        end)
    end

    addHaxeLibrary('FlxColor','flixel.util')

    runHaxeCode([[
        game.strumLineNotes.cameras = [game.camOther];
        game.grpNoteSplashes.cameras = [game.camOther];
        setVar('hudZoom', 1);

        game.camGame.width = FlxG.width * 2;
		game.camGame.height = FlxG.height * 2;
		game.camGame.setPosition(-FlxG.width / 2, -FlxG.height / 2);

		//game.camOther.width = FlxG.width * 2;
		//game.camOther.height = FlxG.height * 2;
		//game.camOther.setPosition(-FlxG.width / 2, -FlxG.height / 2);

        game.timeTxt.visible = false;
        game.timeBar.visible = false;
        game.timeBarBG.visible = false;
        ]])
end
function onUpdate(elapsed)
    totalTimeElapsedSinceStart = totalTimeElapsedSinceStart + elapsed
    if totalTimeElapsedSinceStart >= 0.2 and not canDoCountdown then
        canDoCountdown = true
        startCountdown()
    end
end
function onUpdatePost(elapsed)
    for i, event in pairs(events) do
        if event[1] <= (getSongPosition()-getPropertyFromClass('ClientPrefs','noteOffset'))*0.001 then
            event[2]()
            events[i] = nil
        end
    end
    addHaxeLibrary('FlxMath', 'flixel.math')
    addHaxeLibrary('CoolUtil')
    runHaxeCode([[
        if (game.camZooming)
		{
			game.camOther.zoom = game.camHUD.zoom;
		}
        ]])
    if (getSongPosition()-getPropertyFromClass('ClientPrefs','noteOffset'))*0.001 >= 63 then
        for i =0,7 do
            local noteX = 120 * i
            setPropertyFromGroup("strumLineNotes", i, "y", defaultOpponentStrumY0+(math.sin((getSongPosition()-getPropertyFromClass('ClientPrefs','noteOffset')) / crochet + noteX) * staticArrowWave + staticArrowWave * 0.5))
        end
    end
    staticArrowWave = lerp(staticArrowWave,0,elapsed*6)

    amplit = lerp(amplit, 0, elapsed*5)
    runHaxeCode([[
        susCam.setFilters([new ShaderFilter(wiggg.shader)]);
        susCam.angle = game.camOther.angle;
        susCam.x = game.camOther.x;
        susCam.y = game.camOther.y;
        susCam.alpha = game.camOther.alpha;


		wiggg.waveSpeed = 1;

		wiggg.setValue((-]]..tostring(defaultOpponentStrumY0)..[[ - 112 * 0.5) / FlxG.height);
		if (]]..tostring(downscroll)..[[)
		{
			wiggg.setValue((-]]..tostring(defaultOpponentStrumY0)..[[ - 112 * 10.3) / FlxG.height);
		}

		wiggg.waveFrequency = 3.14159265359 * 3;
        wiggg.waveAmplitude = ]]..tostring(amplit)..[[ / FlxG.width;

        for (note in game.notes)
        {
            strumGroup = game.playerStrums;
            if(!note.mustPress) strumGroup = game.opponentStrums;
            strumX = strumGroup.members[note.noteData].x;
            columnX = 0;
            columnX += (note.isSustainNote ? 112  / 2 - note.width / 2 : 0);
		    time = (]]..tostring(getSongPosition())..[[ - note.strumTime) * (0.45 * 1.6) / FlxG.height;//1.6 = song speed
            if (note.isSustainNote)
            {
                note.cameras = [susCam];
            }else{
                note.cameras = [game.camOther];
    			note.x = (strumX) + columnX + FlxMath.fastSin(time * 3.14159265359 * 3) * ]]..tostring(amplit)..[[;
            }
        }
	]])
end

function onBeatHit()
    if bounceCam then
        doTweenY('camNotes bounce 0', 'camOther', 50, 0.23, 'QuadOut')
        doTweenY('camGame bounce 0', 'camGame', (-getPropertyFromClass('flixel.FlxG', 'height') / 2) + 40, 0.23, 'QuadOut')
    end
    if (getSongPosition()-getPropertyFromClass('ClientPrefs','noteOffset'))*0.001 >= 32.5 and curBeat % 2 == 1 then
        if l then
            amplit = -250--WIGGLE_AMPLITUDE
        else
            amplit = 250--WIGGLE_AMPLITUDE
        end
        l = not l
    end
end

function onStepHit()
    if strumBoops then
        if curStep % 16 == 0 then
            setProperty("camGame.angle", -10)
            setProperty("camOther.angle", 5)
            doTweenAngle('camBoop1 angle1', 'camGame', 0, 0.45, 'SineOut')
            doTweenAngle('camBoop2 angle1', 'camOther', 0, 0.45, 'SineOut')
            staticArrowWave = 90
        elseif curStep % 16 == 10 then
            setProperty("camGame.angle", 10)
            setProperty("camOther.angle", -5)
            doTweenAngle('camBoop1 angle2', 'camGame', 0, 0.45, 'SineOut')
            doTweenAngle('camBoop2 angle2', 'camOther', 0, 0.45, 'SineOut')
            staticArrowWave = 90
        end
    end
end

function onTimerCompleted(tag, loops, loopsleft)
    if tag == 'heyEnd' then
        runHaxeCode("game.boyfriend.specialAnim = false;game.boyfriend.dance();")

    elseif tag == 'creditsBye' then
        doTweenX('a', 'vinceKaichan', 0-getProperty('vinceKaichan.width'), 0.5, SineInOut)
        doTweenX('a2', 'kawaiSprite', getPropertyFromClass('flixel.FlxG', 'width'), 0.5, SineInOut)
        doTweenX('a3', 'me', 0-getProperty('me.width'), 0.5, SineInOut)
        runTimer('creditsDed', 0.6)

    elseif tag == 'creditsDed' then
        removeLuaSprite('vinceKaichan', true)
        removeLuaSprite('kawaiSprite', true)
        removeLuaSprite('me', true)
    elseif tag == "cam yuppi" then
        doTweenAngle("cams1 www", "camGame", 0, 0, "Linear")
        doTweenAngle("cams2 ddd", "camOther", 0, 0, "Linear")
    end
end

function onTweenCompleted(tag)
    if tag == "camOther left1" then
        doTweenX("camOther right1", "camOther", 100, (stepCrochet*0.001) * 1.7, "QuintInOut")
    elseif tag == "camOther right1" then
        doTweenX("camOther left2", "camOther", -100, (stepCrochet*0.001) * 1.7, "QuintInOut")
    elseif tag == "camOther left2" then
        doTweenX("camOther middle", "camOther", 0, (stepCrochet*0.001) * 1.7, "QuintInOut")
    elseif tag == "cams2 spinny2" then
        doTweenAngle("cams1 www", "camGame", 0, 0, "Linear")
        doTweenAngle("cams2 ddd", "camOther", 0, 0, "Linear")
    end
    if tag == 'camNotes bounce 0' then
        doTweenY('camNotes bounce 1', 'camOther', 0, 0.23, 'QuadIn')
        doTweenY('camGame bounce 1', 'camGame', (-getPropertyFromClass('flixel.FlxG', 'height') / 2), 0.23, 'QuadIn')
    end
end

function onCountdownTick(counter)
    if counter == 0 then
        credits()
    end
	-- counter = 0 -> "Three"
	-- counter = 1 -> "Two"
	-- counter = 2 -> "One"
	-- counter = 3 -> "Go!"
	-- counter = 4 -> Nothing happens lol, tho it is triggered at the same time as onSongStart i think
end

function credits()
	makeLuaSprite('vinceKaichan', 'vincekaichan', 0, 405)
    setProperty('vinceKaichan.x', 0-getProperty('vinceKaichan.width'))
	setScrollFactor('vinceKaichan', 0, 0)
    setObjectCamera("vinceKaichan", 'other');
    
	makeLuaSprite('kawaiSprite', 'kawaisprite', 0, 497)
    setProperty('kawaiSprite.x', getPropertyFromClass('flixel.FlxG', 'width'))
	setScrollFactor('kawaiSprite', 0, 0);
    setObjectCamera("kawaiSprite", 'other');

	makeLuaSprite('me', 'me', 0, 497)
    setProperty('me.x', 0-getProperty('me.width'))
	setScrollFactor('me', 0, 0);
    setObjectCamera("me", 'other');

	addLuaSprite('vinceKaichan', false);
	addLuaSprite('kawaiSprite', false);
	addLuaSprite('me', false);
    
    doTweenX('a', 'vinceKaichan', 0, 0.5, SineOut)
    doTweenX('a2', 'kawaiSprite', getPropertyFromClass('flixel.FlxG', 'width') - getProperty('kawaiSprite.width'), 0.5, SineOut)
    doTweenX('a3', 'me', 0, 0.5, SineOut)

    runTimer('creditsBye',getPropertyFromClass('Conductor', 'crochet')/1000 * 7.8)
end

function onStartCountdown()
    if canDoCountdown == false then
        return Function_Stop;
    end
    return Function_Continue;
end