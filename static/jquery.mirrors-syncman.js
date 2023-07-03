(function($) {
const fnFieldSorter = function (fields) {
	// Source: https://stackoverflow.com/a/30446887/1516015
	return function (a, b) {
		return fields
			.map(function (o) {
				var dir = 1
				if (o[0] === '-') {
					dir = -1
					o = o.substring(1)
				}
				if (a[o] > b[o]) return dir
				if (a[o] < b[o]) return -(dir)
				return 0
			})
			.reduce(function firstNonZeroValue (p, n) {
				return p ? p : n
			}, 0)
	}
}
const fnSortDir = function (files) {
	return files.sort(fnFieldSorter(['-isJumper', '-isDir', 'name']))
}
$(window).on('load', function() {
    const $flc = $('[data-files-container]')
    const $fls = $('[data-files]').hide()
	const fnCloneRow = function ($fls, files, doClear) {
		const $frc = $fls.find('[data-files-row-clone]')
		const $frs = $fls.find('[data-files-rows]')
		if (doClear) {
			$fls.find('[data-files-row]').filter(function () {
				return $(this).is('[data-files-row-clone]') ? false : true
			}).remove()
		}
		$.each(files, function (i, row) {
			let name = row.isDir ? '[' + row.name + ']' : row.name
			const $nrow = $frc.clone(true, true).removeAttr('data-files-row-clone')
			.data(row).appendTo($frs)
			.find('[data-files-row-name]').html(name)
			if (row.missing) {
				$nrow.addClass('text-danger')
			}
		})
	}
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
				} else if (typeof obj == 'object' && obj.type) {
					data = obj
					if (data.type == 'smb' && data.share) {
						data.path = data.share + '\\' + data.open
					}
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
					fnCloneRow($dfp.closest('[data-files]'), fnSortDir(res.files), true)
                }
            })
        }, 300)
    })
    $('body').on('click', '[data-files-sync]', function () {
        const $df1 = $(this)
		const $df = $df1.closest('[data-files]')
		const $df2 = $df.next('[data-files]')
		const list1 = []
		const list2 = []
		const list21 = []
        $df.find('[data-files-row]').not('[data-files-row-clone]').each(function () {
			list1.push($(this).data())
		})
		console.log(list1)
		$df2.find('[data-files-row]').not('[data-files-row-clone]').each(function () {
			list2.push($(this).data())
		})
		console.log(list2)
		$.each(list1, function (i, row) {
			const row2 = list2.find(x => x.name === row.name)
			if (row2 == undefined) {
				// console.log('missing from list2', row)
				row.missing = true
				// fnCloneRow($df2, [row])
			}
			list21.push(row)
		})
		fnSortDir(list21)
		fnCloneRow($df2, list21, true)
    })

})

})(jQuery);
