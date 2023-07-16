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
	const fnRowName = function ($row, data) {
		let name = data.isDir ? '[' + data.name + ']' : data.name
		return $row.find('[data-files-row-name]').html(name).attr('title', name)
	}
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
			const $nrow = $frc.clone(true, true).removeAttr('data-files-row-clone')
			$nrow.data(row).appendTo($frs)
			fnRowName($nrow, row)
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
	const fnDelCol = function (col) {
		$('[data-files]').filter(function () {
			return $(this).data().num == col
		}).remove()
	}
	const fnReadCols = function (colNums) {
		if (typeof colNums !== 'array') {
			colNums = [colNums]
		}
		$.ajax({
			'url': 'http://localhost:8089/read-cols',
			'type': 'POST',
			'dataType': 'json',
			'data': {
				colNums: colNums
			},
			'success': function (res) {
				console.log(res)
				$.each(res.cols, function (i, data) {
					console.log(data)
					// fnDelCol(data.num)
					if (data.open) {
						data.path = data.share + '\\' + data.open
					} else {
						data.path = data.share
					}
					data.num = data.num * 1
					let $col
					if (colNums.includes(data.num)) {
						$col = $('[data-files]').filter(function () {
							return $(this).data().num == data.num
						})
					} else {
						$col = $fls.clone(true, true).show().appendTo($flc)
					}
					$col.data(data)
					$col.find('[data-files-path]').val(data.path).trigger('input')
					$col.find('[data-files-num]').html(data.num).addClass('msm-num-disc--' + data.num)
				})
			}
		})
	}
    fnReadCols()
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
			if ($files.find('[data-files-sync]').data().active() == false) {
				return this
			}
			$files.find('[data-files-row]').eq(index).addClass('msm-files-row--hover')
		})
    })
	$('body').on('mouseleave', '[data-files-row]', function () {
		$('[data-files-row]').removeClass('msm-files-row--hover')
    })
    $('body').on('input', '[data-files-path]', function () {
        const $path = $(this)
		const dataPath = $path.data()
		const $files = $path.closest('[data-files]')
        const dataCol = $files.data()
        if (dataPath.filesPathTime) {
            clearTimeout(dataPath.filesPathTime)
        }
        dataPath.filesPathTime = setTimeout(function() {
            if (dataPath.$filesPathReq != null) {
                dataPath.$filesPathReq.abort()
                dataPath.$filesPathReq = null
            }
            dataPath.$filesPathReq = $.ajax({
                'url': 'http://localhost:8089/' + dataCol.type,
				'type': 'POST',
                'dataType': 'json',
                'data': $.extend({}, dataCol, {
					'open': $path.val()
				}, true),
                'success': function (res) {
                    console.log(res)
					if (res.problem) {
						dataCol.problem = res.problem
						const $als = $files.find('[data-files-alerts]')
						const $alc = $als.find('[data-files-alert-clone]')
						const $alr = $alc.clone(true, true).removeAttr('data-files-alert-clone')
						$alr.appendTo($als).find('[data-files-alert-text]').text(res.problem)
						return false
					}
					fnCloneRow($path.closest('[data-files]'), fnSortDir(res.files), true)
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
			if (td.problem) return this
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
	$('body').on('click', '[data-files-sync]', function () {
		if ($('[data-navbar-btn-sync]').data().active() == false) {
			return this
		}
		fnSyncList()
    })
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
	const $modCe = $('[data-msm-modal-ce]')
	const bsModCe = new bootstrap.Modal($modCe)
	const $modRen = $('[data-msm-modal-rename]')
	const bsModRen = new bootstrap.Modal($modRen)
	$('body').on('click', '[data-files-ce-open]', function () {
		const $files = $(this).closest('[data-files]')
        const dataCol = $files.data()
		console.log(dataCol)
		$modCe.find(':input').val('')
		bsModCe.show()
		if (dataCol == undefined) return this
		$modCe.find('[name="num"]').val(dataCol.num)
		$modCe.find('[name="share"]').val(dataCol.share)
		$modCe.find('[name="type"]').val(dataCol.type)
		$modCe.find('[name="open"]').val(dataCol.open)
		$modCe.find('[name="domain"]').val(dataCol.domain)
		$modCe.find('[name="username"]').val(dataCol.username)
		$modCe.find('[name="password"]').val(dataCol.password)
    })
	$('body').on('click', '[data-mbtn-ce-del]', function () {
		const dataCol = $modCe.serializeJSON()
		if (confirm('Delete column ' + $modCe.find('[name="num"]').val() + '?')) {
			$.ajax({
				'url': 'http://localhost:8089/del-col',
				'type': 'POST',
				'dataType': 'json',
				'data': {
					'col' : dataCol
				},
				'success': function (res) {
					console.log(res)
					fnDelCol(dataCol.num)
					bsModCe.hide()
				}
			})
		}
    })
	$('body').on('click', '[data-mbtn-ce-save]', function () {
		const dataCol = $modCe.serializeJSON()
		console.log(dataCol)
		$.ajax({
			'url': 'http://localhost:8089/save-col',
			'type': 'POST',
			'dataType': 'json',
			'data': {
				'col' : dataCol
			},
			'success': function (res) {
				console.log(res)
				fnReadCols(dataCol.num * 1)
				bsModCe.hide()
			}
		})
    })
	$('body').on('click', '[data-files-row-action]', function () {
		const $row = $(this).closest('[data-files-row]')
		const $col = $row.closest('[data-files]')
		const dataRow = $row.data()
		const dataCol = $col.data()
		bsModRen.show()
		$modRen.find('[name="name"]').val(dataRow.name)
		$modRen.off('click', '[data-mbtn-rename-save]')
		$modRen.on('click', '[data-mbtn-rename-save]', function () {
			$.ajax({
				'url': 'http://localhost:8089/rename-row',
				'type': 'POST',
				'dataType': 'json',
				'data': {
					'col' : dataCol,
					'oldRow': dataRow,
					'newRow': $modRen.serializeJSON()
				},
				'success': function (res) {
					console.log(res)
					$row.data(res.row)
					fnRowName($row, res.row)
					bsModRen.hide()
				}
			})
		})
    })
	$modRen.on('shown.bs.modal', function() {
		$('[name="name"]').trigger('select')

	})
	$('body').on('submit', 'form', function () {
		/**
		 * Prevent form submit by hitting Enter.
		 * All occurate forms handled with ajax call.
		 */
		return false
    })
})

})(jQuery);
