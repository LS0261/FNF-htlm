function onEvent(n,v1,v2)
    if n == 'setFocus' then
        local valo = ''
        if v1 == '0' then valo = 'dad'
        elseif v1 == '1' then valo = 'boyfriend'
        elseif v1 == '2' then valo = 'gf' end
        for _,i in pairs({'gf','boyfriend','dad'}) do triggerEvent('Set Camera Target',i,valo) end
        if v2 ~= '' then
            setProperty('cameraSpeed',tonumber(v2))
            triggerEvent('Set Camera Offset',tonumber(v2) > 20 and '0' or '25','')
        end
    end
end