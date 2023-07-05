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
		$.each(files, function (i, fir) {
			const row = $.extend({
				'missing': false,
				'present': []
			}, fir, true)
			let name = row.isDir ? '[' + row.name + ']' : row.name
			const $nrow = $frc.clone(true, true).removeAttr('data-files-row-clone')
			$nrow.data(row).appendTo($frs)
			$nrow.find('[data-files-row-name]').html(name).attr('title', name)
			if (row.missing) {
				$nrow.addClass('missing')
			}
			if (row.missing && row.present) {
				$pres = $nrow.find('[data-files-row-pres]')
				$.each(row.present, function (i, num) {
					$pres.append('<span class="msm-num-disc msm-num-disc--' + num + '">' + num + '</span>')
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
				$clone.find('[data-files-num]').html(data.num).addClass('msm-num-disc--' + data.num)
            })
        }
    })
    $('body').on('dblclick', '[data-files-row]', function () {
        const $th = $(this)
        const td = $th.data()
        $th.closest('[data-files]').find('[data-files-path]').val(td.path).trigger('input')
    })
	$('body').on('mouseover', '[data-files-row]', function () {
		if ($('[data-navbar-btn-sync]').data().active() == false) {
			return this
		}
        const $fr = $(this)
        const dfr = $fr.data()
		const $ff = $fr.closest('[data-files]')
		const index = $ff.find('[data-files-row]').index($fr)
		$('[data-files]').each(function () {
			const $files = $(this)
			const dfiles = $files.data()
			if (dfiles.num == dfr.num) return this
			$files.find('[data-files-row]').eq(index).addClass('msm-files-row--hover')
		})
    })
	$('body').on('mouseleave', '[data-files-row]', function () {
		$('[data-files-row]').removeClass('msm-files-row--hover')
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
	const fnSyncListClear = function () {
		$('[data-files-row]').filter('.missing').remove()
	}
	const fnSyncList = function () {
		const numFiles = {}
		const numLists = {}
		fnSyncListClear()
		$('[data-files]').each(function () {
			const $th = $(this)
			if ($th.find('[data-files-sync]').data().active() == false) return this
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
					const row_n = list_b.find(x => x.name === row_a.name)
					let row_ac = {}
					if (row_n == undefined) {
						row_ac = $.extend({}, row_a, true)
					} else {
						row_ac = $.extend({}, row_n, true)
					}
					if (row_n == undefined) {
						row_ac.missing = true
						if (row_ac.present.includes(num_a) == false) {
							row_ac.present.push(num_a)
						}
					}
					else if (row_ac.missing && row_a.missing == false) {
						row_ac.present.push(num_a)
					}
					// Remove duplicates
					row_ac.present = row_ac.present.filter((e, i) => row_ac.present.indexOf(e) === i)
					list_ab.push(row_ac)
				})
				/**
				 * If data present in B but missing from A then keep it:
				 */
				$.each(list_b, function (i, row_b) {
					const row_n = list_a.find(x => x.name === row_b.name)
					if (row_n == undefined) {
						const row_bc = $.extend({}, row_b, true)
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
	$.initialize('[data-btn-toggle]', function () {
		const $btn = $(this)
		const dbtn = $btn.data()
		dbtn.active = function () {
			return dbtn.btnToggle == 'on'
		}
		$btn.on('click.btnToggle', function () {
			if (dbtn.btnToggle == 'off') {
				dbtn.btnToggle = 'on'
				$btn.addClass(dbtn.btnToggleOn)
				$btn.removeClass(dbtn.btnToggleOff)
			} else if (dbtn.btnToggle == 'on') {
				dbtn.btnToggle = 'off'
				$btn.removeClass(dbtn.btnToggleOn)
				$btn.addClass(dbtn.btnToggleOff)
			}
		})
		dbtn.btnToggle = dbtn.btnToggle == 'on' ? 'off' : 'on'
		$btn.trigger('click.btnToggle')
	})
	$('body').on('click', '[data-navbar-btn-sync]', function () {
		if ($(this).data().active()) {
			fnSyncList()
		} else {
			fnSyncListClear()
		}
    })
})

})(jQuery);
