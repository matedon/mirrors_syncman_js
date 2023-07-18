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
	console.log('window loaded')
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
			$fls.find('[data-files-row-c]').remove()
		}
		$.each(files, function (i, fir) {
			const row = $.extend({
				'missing': false,
				'present': []
			}, fir, true)
			const $nrow = $frc.clone(true, true).removeAttr('data-files-row-clone').attr('data-files-row-c', true)
			$nrow.data(row).appendTo($frs)
			if (row.name == '..') {
				$nrow.addClass('msm-files-row--back')
			}
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
		window.getSelection().removeAllRanges() // Deselect all text which were selected accidentally with dblclick.
        const $row = $(this)
        const dataRow = $row.data()
		const fnRowAction = function ($r, p) {
			return $r.closest('[data-files]').find('[data-files-path]').val(p).trigger('input')
		}
		if ($('[data-navbar-btn-sync]').data().active()) {
			const $rows = $('[data-files-row]').filter(function () {
				const $row = $(this)
				const dataRow = $row.data()
				if (dataRow.hover !== true) return false
				if (dataRow.missing == true) {
					$row.addClass('msm-files-row--flash')
					const time = setTimeout(function () {
						$row.removeClass('msm-files-row--flash')
					}, 3000)
					return false
				}
				return this
			})
			if ($rows.length == $('[data-files]').filter(':visible').length) {
				$rows.each(function () {
					fnRowAction($(this), $(this).data().path)
				})
			}
		} else {
			fnRowAction($row, dataRow.path)
		}
    })
	$('body').on('mouseover', '[data-files-row]', function () {
		if ($('[data-navbar-btn-sync]').data().active() == false) {
			return this
		}
        const $fr = $(this)
		const $ff = $fr.closest('[data-files]')
		if ($ff.find('[data-files-sync]').data().active() == false) {
			return this
		}
		const dfr = $fr.data()
		const index = $ff.find('[data-files-row]').index($fr)
		$('[data-files]').each(function () {
			const $files = $(this)
			const dfiles = $files.data()
			if (dfiles.num == dfr.num) return this
			if ($files.find('[data-files-sync]').data().active() == false) {
				return this
			}
			$files.find('[data-files-row]').eq(index).data('hover', true).addClass('msm-files-row--hover')
		})
    })
	$('body').on('mouseleave', '[data-files-row]', function () {
		$('[data-files-row]').data('hover', false).removeClass('msm-files-row--hover')
    })
	const fnFilesProblem = function ($item, problem, fnYes, fnNo) {
		const $files = $item.closest('[data-files]')
		const dataFiles = $files.data()
		if (problem) {
			dataFiles.problem = problem
			const $als = $files.find('[data-files-alerts]')
			const $alc = $als.find('[data-files-alert-clone]')
			const $alr = $alc.clone(true, true).removeAttr('data-files-alert-clone')
			$alr.appendTo($als).find('[data-files-alert-text]').text(problem)
			if (typeof fnNo == 'function') {
				fnNo()
			}
		} else {
			if (typeof fnYes == 'function') {
				fnYes()
			}
		}
	}
	let syncTime
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
					fnFilesProblem($files, res.problem, function () {
						fnCloneRow($path.closest('[data-files]'), fnSortDir(res.files), true)
						if ($('[data-navbar-btn-sync]').data().active()) {
							if (syncTime) clearTimeout(syncTime)
							syncTime = setTimeout(function () {
								fnSyncList()
							}, 300)
						}
					})
                }
            })
        }, 500)
    })
	const fnSyncListClear = function () {
		$('[data-files-row]').filter('.missing').remove()
		$('[data-files-path]').removeAttr('readonly')
		$('[data-files-row-rename--r1]').show()
		$('[data-files-row-rename--ra]').hide()
	}
	const fnSyncList = function () {
		console.log('fnSyncList')
		const numFiles = {}
		const numLists = {}
		fnSyncListClear()
		$('[data-files]').each(function () {
			const $col = $(this)
			if ($col.find('[data-files-sync]').data().active() == false) return this
			const dataCol = $col.data()
			if (dataCol.problem) return this
			if (dataCol.num == undefined) return this
			numFiles[dataCol.num] = $col
			numLists[dataCol.num] = []
			$col.find('[data-files-row-c]').each(function () {
				numLists[dataCol.num].push($(this).data())
			})
			$col.find('[data-files-path]').attr('readonly', true)
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
		fnSyncedRowsActions()
	}
	const fnSyncedRowsActions = function () {
		if ($('[data-navbar-btn-sync]').data().active() == false) {
			return this
		}
		const $files = $('[data-files]').filter(function () {
			const $file = $(this)
			if ($file.is(':visible') == false) return false
			if ($file.find('[data-files-sync]').data().active() == false) return false
			return true
		})
		const $files_a = $files.filter(':first')
		const $files_bc = $files.not(':first')
		$files_a.find('[data-files-row-c]').each(function () {
			const $row_a = $(this)
			const data_a = $row_a.data()
			if (data_a.name == '..') return this
			const index_a = $files_a.find('[data-files-row-c]').index($row_a)
			const missings = [data_a.missing]
			const rows = [$row_a]
			$files_bc.each(function () {
				$(this).find('[data-files-row-c]').eq(index_a).each(function () {
					const $row = $(this)
					rows.push($row)
					missings.push($row.data('missing'))
				})
			})
			let noMissing = true
			$.each(missings, function (i, value) {
				noMissing = noMissing && ! value
			})
			if (noMissing) {
				$.each(rows, function (i, $row) {
					$row.find('[data-files-row-rename--r1]').hide()
					$row.find('[data-files-row-rename--ra]').show()
				})
			} else {
				$.each(rows, function (i, $row) {
					$row.find('[data-files-row-rename--r1]').hide()
					$row.find('[data-files-row-rename--ra]').hide()
				})
			}
			// console.log(data_a.name, missings, noMissing, rows)
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
		$btn.off('mousedown.btnToggle')
		$btn.on('mousedown.btnToggle', function () {
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
		$btn.trigger('mousedown.btnToggle')
	})
	$('body').on('mouseup', '[data-navbar-btn-sync]', function () {
		console.log('[data-navbar-btn-sync] click')
		if ($(this).data().active()) {
			fnSyncList()
		} else {
			fnSyncListClear()
		}
    })
	const $modCe = $('[data-msm-modal-ce]')
	const bsModCe = new bootstrap.Modal($modCe)
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
	const $modRen = $('[data-msm-modal-rename]')
	const bsModRen = new bootstrap.Modal($modRen)
	$('body').on('click', '[data-files-row-rename]', function () {
		const $btn = $(this)
		const isR1 = $btn.is('[data-files-row-rename--r1]')
		const isRa = $btn.is('[data-files-row-rename--ra]')
		let $rows = $()
		if (isR1) {
			$modRen.find('[data-msm-modal-title--r1]').show()
			$modRen.find('[data-msm-modal-title--ra]').hide()
			$rows = $btn.closest('[data-files-row]')
		}
		if (isRa) {
			$modRen.find('[data-msm-modal-title--r1]').hide()
			$modRen.find('[data-msm-modal-title--ra]').show()
			$rows = $('[data-files-row]').filter(function () {
				const $row = $(this)
				const dataRow = $row.data()
				if (dataRow.hover !== true) return false
				if (dataRow.missing == true) return false
				return this
			})
		}
		bsModRen.show()
		$modRen.find('[name="name"]').val($btn.closest('[data-files-row]').data('name'))
		$modRen.off('click', '[data-mbtn-rename-save]')
		$modRen.on('click', '[data-mbtn-rename-save]', function () {
			let successCount = 0
			const fnSuccessAll = function () {
				bsModRen.hide()
			}
			$rows.each(function () {
				const $row = $(this)
				const $col = $row.closest('[data-files]')
				const dataRow = $row.data()
				const dataCol = $col.data()
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
						fnFilesProblem($row, res.problem, function () {
							$row.data(res.row)
							fnRowName($row, res.row)
						})
						successCount ++
						if (successCount == $rows.length) {
							fnSuccessAll()
						}
					}
				})
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
