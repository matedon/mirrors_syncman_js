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
	let colNum = 0
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
			$nrow.data(row).appendTo($frs)
			$nrow.find('[data-files-row-name]').html(name)
			if (row.missing) {
				$nrow.addClass('missing')
			}
			if (row.present) {
				$pres = $nrow.find('[data-files-row-pres]')
				$.each(row.present, function (i, num) {
					$pres.append('<span class="msm-num-disc">' + num + '</span>')
				})
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
				data.num = colNum ++
                $clone = $fls.clone(true, true).show().appendTo($flc).data(data)
                $clone.find('[data-files-path]').val(data.path).trigger('input')
				$clone.find('[data-files-num]').html(data.num)
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
		const $df = $dfp.closest('[data-files]')
        const dataCol = $df.data()
        if (dataCol.filesPathTime) {
            clearTimeout(dataCol.filesPathTime)
        }
        dataCol.filesPathTime = setTimeout(function() {
            if (dataCol.$filesPathReq != null) {
                dataCol.$filesPathReq.abort()
                dataCol.$filesPathReq = null
            }
            dataCol.$filesPathReq = $.ajax({
                'url': 'http://localhost:8089/' + dataCol.type,
				'type': 'POST',
                'dataType': 'json',
                'data': $.extend({}, dataCol, {
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
	const fnSyncList = function () {
		const numFiles = {}
		const numLists = {}
		$('[data-files-row]').filter('.missing').remove()
		$('[data-files]').each(function () {
			const $th = $(this)
			if ($th.find('[data-files-sync]').data().active == false) return this
			const td = $th.data()
			if (td.num == undefined) return this
			numFiles[td.num] = $th
			numLists[td.num] = []
			$th.find('[data-files-row]').not('[data-files-row-clone]').each(function () {
				numLists[td.num].push($(this).data())
			})
		})
		$.each(numLists, function(num_a, list_a) {
			$.each(numLists, function(num_b, list_b) {
				if (num_a == num_b) return true
				const list_ab = []
				$.each(list_a, function (i, row_a) {
					const row_ac = $.extend({}, row_a, true)
					const row_n = list_b.find(x => x.name === row_a.name)
					if (row_n == undefined) {
						row_ac.missing = true
						if (row_ac.present == undefined) {
							row_ac.present = []
						}
						if (row_ac.present.includes(num_a) == false) {
							row_ac.present.push(num_a)
						}
					} else if (row_ac.missing && row_ac.present.includes(num_b)) {
						row_ac.present = jQuery.grep(row_ac.present, function(value) {
							// Remove num_b from present array
							return value != num_b
						})
						if (row_ac.present.length == 0) {
							row_ac.missing = false
						}
					}
					list_ab.push(row_ac)
				})
				$.each(list_b, function (i, row_b) {
					const row_bc = $.extend({}, row_b, true)
					const row_n = list_a.find(x => x.name === row_b.name)
					if (row_n == undefined) {
						list_ab.push(row_bc)
					}
				})
				if (list_ab.length) {
					numLists[num_b] = list_ab
				}
			})
		})
		$.each(numLists, function(num, list) {
			fnSortDir(list)
			fnCloneRow(numFiles[num], list, true)
		})
	}
    $('body').on('click', '[data-files-sync]', function () {
		const $btn = $(this)
		const dbtn = $btn.data()
        $btn.toggleClass('btn-info').toggleClass('btn-light')
		dbtn.active = ! dbtn.active
    })
	$('body').on('click', '[data-navbar-btn-sync]', function () {
		fnSyncList()
    })

})

})(jQuery);
