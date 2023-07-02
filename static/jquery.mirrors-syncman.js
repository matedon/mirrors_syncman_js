(function($) {

$(window).on('load', function() {
    const $flc = $('[data-files-container]')
    const $fls = $('[data-files]').hide()
    $.ajax({
        'url': 'http://localhost:8089/config',
		'type': 'POST',
        'dataType': 'json',
        'success': function (res) {
            console.log(res)
            $.each(res.paths, function (i, obj) {
                console.log(obj)
				let data = {}
				if (typeof obj == 'string') {
					data.path = obj
					data.type = 'files'
				} else if (typeof obj == 'object' && obj.path) {
					data = obj
				}
                $fls.clone(true, true).show().appendTo($flc)
                .find('[data-files-path]').val(data.path).data(data).trigger('input')
            })
        }
    })
    $('body').on('dblclick', '[data-files-row]', function () {
        const $th = $(this)
        const td = $th.data()
        $th.closest('[data-files]').find('[data-files-path]').val(td.path).trigger('input')
    })
    $('body').on('input', '[data-files-path]', function () {
        const $dfp = $(this)
        const ddfp = $dfp.data()
        if (ddfp.filesPathTime) {
            clearTimeout(ddfp.filesPathTime)
        }
        ddfp.filesPathTime = setTimeout(function() {
            if (ddfp.$filesPathReq != null) {
                ddfp.$filesPathReq.abort()
                ddfp.$filesPathReq = null
            }
            ddfp.$filesPathReq = $.ajax({
                'url': 'http://localhost:8089/' + ddfp.type,
				'type': 'POST',
                'dataType': 'json',
                'data': $.extend({}, ddfp, {
					'open': $dfp.val()
				}, true),
                'success': function (res) {
                    console.log(res)
					if (res.problem) {
						alert(res.problem)
						return false
					}
                    const $fls = $dfp.closest('[data-files]')
                    const $frc = $fls.find('[data-files-row-clone]')
                    const $frs = $fls.find('[data-files-rows]')
                    $fls.find('[data-files-row]').filter(function () {
                        return $(this).is('[data-files-row-clone]') ? false : true
                    }).remove()
                    $.each(res.files, function (i, row) {
                        console.log(row.name)
                        let name = row.isDir ? '[' + row.name + ']' : row.name
                        $frc.clone(true, true).removeAttr('data-files-row-clone')
                        .data(row).appendTo($frs)
                        .find('[data-files-row-name]').html(name)
                    })
                }
            })
        }, 300)
    })
    // $('[data-files-path]').trigger('input')

})

})(jQuery);
