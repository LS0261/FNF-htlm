
--How makeLuaSprite works:
--makeLuaSprite(<SPRITE VARIABLE>, <SPRITE IMAGE FILE NAME>, <X>, <Y>);
--"Sprite Variable" is how you refer to the sprite you just spawned in other methods like "setScrollFactor" and "scaleObject" for example

--so for example, i made the sprites "stagelight_left" and "stagelight_right", i can use "scaleObject('stagelight_left', 1.1, 1.1)"
--to adjust the scale of specifically the one stage light on left instead of both of them

function onCreate()
	makeLuaSprite('stageback', 'stageback', 0, 0);
	setProperty('stageback.offset.x', 600)
	setProperty('stageback.offset.y', 300)
	setScrollFactor('stageback', 0.9, 0.9);
	
	makeLuaSprite('stagefront', 'stagefront', 0,0);
	setScrollFactor('stagefront', 0.9, 0.9);
	scaleObject('stagefront', 1.2, 1.2);
	setProperty('stagefront.offset.x', 600)
	setProperty('stagefront.offset.y', -600)

	-- sprites that only load if Low Quality is turned off
	if not lowQuality then
		makeLuaSprite('stagelight_left', 'stage_light', 0,0);
		setScrollFactor('stagelight_left', 0.9, 0.9);
		scaleObject('stagelight_left', 1.1, 1.1);
		setProperty('stagelight_left.offset.x', -125)
		setProperty('stagelight_left.offset.y', 100)
		
		makeLuaSprite('stagelight_right', 'stage_light', 0,0);
		setScrollFactor('stagelight_right', 0.9, 0.9);
		scaleObject('stagelight_right', 1.1, 1.1);
		setProperty('stagelight_right.flipX', true); --mirror sprite horizontally
		setProperty('stagelight_right.offset.x', -1225)
		setProperty('stagelight_right.offset.y', 100)

		makeLuaSprite('stagecurtains', 'stagecurtains', 0,0);
		setScrollFactor('stagecurtains', 1.6, 1.4);
		scaleObject('stagecurtains', 1, 1);
		setProperty('stagecurtains.offset.x', 950)
		setProperty('stagecurtains.offset.y', 360)
	end
	addLuaSprite('stageback', false);
	addLuaSprite('stagefront', false);
	addLuaSprite('stagelight_left', false);
	addLuaSprite('stagelight_right', false);
	addLuaSprite('stagecurtains', true);
end