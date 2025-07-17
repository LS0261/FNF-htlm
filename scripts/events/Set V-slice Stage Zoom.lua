function onEvent(n,v1,v2)
    if n == 'Set V-slice Stage Zoom' then
        setProperty('defaultCamZoom',(tonumber(v1)))
        cancelTween('camGame')
        if v2 == 'Instant' then setProperty('camGame.zoom',tonumber(v2))
        else doTweenZoom('camGame','camGame',(tonumber(v1)),(stepCrochet/1000)*tonumber(v2),'quadOut') end
    end
end