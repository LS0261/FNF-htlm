ogZoom = nil
function onCreatePost() ogZoom = getProperty('defaultCamZoom') end
function onEvent(n,v1,v2)
    if n == 'Set V-slice Zoom' then
        setProperty('defaultCamZoom',ogZoom*(tonumber(v1)))
        canAlt = false
        if v2 == 'Instant' then setProperty('camGame.zoom',ogZoom*(tonumber(v1)))
        else
            vals = {v2,4}
            if v2:find(',') then vals = stringSplit(v2,',') end
            doTweenZoom('camGame','camGame',ogZoom*(tonumber(v1)),(stepCrochet/1000)*vals[2],vals[1])
        end
        if not v2:find(',') then
            for i = 0,9 do if v2:find(i) then canAlt = true end end
        end
        if canAlt == true then
            cancelTween('camGame')
            doTweenZoom('camGame','camGame',ogZoom*(tonumber(v1)),(stepCrochet/1000)*tonumber(v2),'quadOut')
        end --es que me di cuenta de esta boludez durante worship, que boludo
    elseif n == 'Set V-slice Stage Zoom' then
        setProperty('defaultCamZoom',(tonumber(v1)))
        cancelTween('camGame')
        doTweenZoom('camGame','camGame',(tonumber(v1)),(stepCrochet/1000)*tonumber(v2),'quadOut')
        ogZoom = tonumber(v1)
    end
end