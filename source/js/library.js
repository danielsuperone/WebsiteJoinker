var is_dirty	= false;
$(document).ajaxComplete(function(){buildCSSElements();})
$(document).ajaxError(function(event, jqxhr, settings, thrownError) {
	console.log(event);
	console.log(thrownError);
	wait_message.hide();

	if(jqxhr.getAllResponseHeaders()) {
		alert("The system couldn't currently process your request.\n\nThe team at MySchool have been informed and will investigate further. \n\nKindly refresh the page, all functionality should return in the next few minutes");
	}
});
$(document).on( "tabscreate", "#tab_container", function( event, ui ) {
    setupScrollableTabs();
} );

$(window).resize(function() {
    setupScrollableTabs();
});

var setupScrollableTabs = function(){
    $("#tab_container:not(.no-scroll)").each(function(){
    	var container = $(this);
    	var tabs = $(this).find('.ui-tabs-nav');
        container.addClass('scrolling');
        var containerWidth = container.width();
        var tabsWidth = tabs.width();
        if(tabsWidth > containerWidth){
				var leftButton = $("<div>chevron_left</div>").addClass('left');
			if(container.children('.left').length === 0) {
				leftButton.click(function(){
					var currentPosition = tabs.position().left;
					var newPosition = currentPosition + 200;
					var leftButtonWidth = leftButton.width();

					if(newPosition > leftButtonWidth){
						newPosition = leftButtonWidth;
					}
					tabs.animate({
						left: newPosition
					}, 400);
				});

				container.prepend(leftButton);
			}

				var rightButton = $("<div>chevron_right</div>").addClass('right');
			if(container.children('.right').length === 0) {
				rightButton.click(function(){
					var containerWidth = container.width();
					var tabsWidth = tabs.width();

					var currentPosition = tabs.position().left;
					var newPosition = currentPosition - 200;
					var paddingLeft = parseInt(tabs.css("padding-left"));

					var leftLimit = -tabsWidth + containerWidth - rightButton.width() - paddingLeft*2;
					if(newPosition < leftLimit){
						newPosition = leftLimit;
					}
					tabs.animate({
						left: newPosition
					}, 400);
				});

				container.prepend(rightButton);
			}
		}else{
            container.removeClass('scrolling');
		}
    });
};

function rebuildDiscussion(){
    $('.discussion').discussion(  );
}

$.fn.fileUpload = function(a){
	var multiple = true;
	var on_complete = function(){};
	var file_name = 'new_file_id[]';

	if("object" == typeof a||undefined == a) {
		if ("object" == typeof a) {
			if ('multiple' in a) {
				multiple = a.multiple;
			}

			if('complete' in a){
				on_complete = a.complete;
			}

			if('file_name' in a){
				file_name = a.file_name;
			}
		}
	}

	var uploadContainers = this;
	$(uploadContainers).each(function(x, uploadContainer){
		var target_id = $(uploadContainer).attr('id');
		var button_id = buildID();
		var containerType = $(uploadContainer).prop("tagName")

		var isTable = 'TABLE'==containerType;
		var isDiv = 'DIV'==containerType;

		if(isTable){
			var footer_tr = $('<tr>');
			footer_tr.append($('<td class="right">').append($('<button type="button">upload</button>').attr('id', button_id)))
			if($(uploadContainer).find('tfoot').lenth==0){
				$(uploadContainer).append($('<tfoot>'));
			}
			$(uploadContainer).find('tfoot').append(footer_tr);
		} else if(isDiv) {
			$(uploadContainer).append($('<button type="button">upload</button>').attr('id', button_id));
		}


		var uploader = new plupload.Uploader({
			runtimes: 'html5,html4', multi_selection : multiple, browse_button:button_id, url:'/data/upload.php?direct=1',
			container : document.getElementById(target_id),
			multipart_params: {},
			filters : {
				max_file_size : upload_max_filesize,
			},
			init: {
				Error: function(up, err) {
					console.log(err);
				},
				FilesAdded: function(up, files) {
					$(uploadContainer).find('td.no_data').parent().remove();
					$(uploadContainer).find('td.no_data_small').parent().remove();

					if(!multiple){
						$(uploadContainer).find('tbody tr').remove();
					}
					plupload.each(files, function(file) {
						var tr = $('<tr>');
						tr.append($('<td class="ui-autocomplete-loading">').html(file.name));
						$(uploadContainer).find('tbody').append(tr);
					});

					up.start();
				},
				UploadComplete: function(up, files){
					on_complete();
				},
				FileUploaded: function(up, file, object) {
					if(isTable){

					}
					$(uploadContainer).find('.ui-autocomplete-loading').removeClass('ui-autocomplete-loading');

					try {
						response = eval(object.response);
					} catch(err) {
						response = eval('(' + object.response + ')');
					}

					if(!multiple){
						$(uploadContainer).find('.new_file').remove();
					}

					var resource_file = $('<input name="new_file_id[]" class="new_file" type="hidden">').prop('name', file_name).attr('value', parseInt(response.id));
					$(uploadContainer).append(resource_file);
				}
			}
		});
		uploader.init();
	});
}

$.fn.discussion = function(a){
	var id = buildID();
	var discussion_containers = this;
	var current_textarea;

	$(discussion_containers).each(function(x, discussion_container){
        var entity_name = $(discussion_container).data('entity_name');
        var entity_key = $(discussion_container).data('entity_key');
        var richtext = $(discussion_container).data('richtext');
        var thread_entry_count = 0;
		var timeoutID;
        $(discussion_container).html("");

        function updateDiscussionCheck(){
            $.getJSON(
                '/data/common_handler.php?action=Discussion_Header::AJAX_U_GetDiscussionThreadCount',
                {entity_name: entity_name, entity_key: entity_key},
                function (current_thread_count) {
                	if(thread_entry_count!=current_thread_count){
                        var audio = new Audio('/resources/fb_messge_pop_ding.mp3');
                        //$(discussion_container).prepend('<div style="background-color:#b8ffb8;padding:3px;text-align: center;">new message (<a href="javascript:rebuildDiscussion();">refresh</a>)!</div>');
                        loadDiscussion(false);
                        audio.play();
                        thread_entry_count = current_thread_count;
					}
                }
			);
        }

        function loadDiscussion(first_build){
           // $(discussion_container).html("");
            $.getJSON(
                '/data/common_handler.php?action=Discussion_Header::AJAX_U_LoadDiscussionHeader',
                {entity_name: entity_name, entity_key: entity_key},
                function (discussion_header) {
//Fetches all thread entries for current form
                    $(discussion_header.discussions).each(function (i, threadEntry) {
                        buildThreadEntry(threadEntry);
                    });
                    thread_entry_count = discussion_header.discussions.length;
                    if(first_build){
                        var textarea = buildReplyTextArea(discussion_header.discussion_header_id, 0, false);
                        $(discussion_container).after(textarea);
					}
                    if(current_textarea){
                    	current_textarea.focus();
					}else{
                    	$(discussion_container).parent().find('textarea:last').focus();
					}

                }
            );

        }

        if("object" == typeof a||undefined == a){
            var content_container = $('<div class="cd-panel-container">');
            if("object" == typeof a){
                if('entity_name' in a){
                    entity_name = a.entity_name;
                }

                if('entity_key' in a){
                    entity_key = a.entity_key;
                }
            }
        }

        function buildReplyTextArea(discussion_header_id ,parent_discussion_id, remove_on_post, reply_link){
        	var div = $("<div class='reply_area'>");
            var textarea = $('<textarea class="autoexpand" style="width:100%;border-radius: 5px;">');

			if(reply_link){
				reply_link.toggle();
			}
            textarea.TextAreaExpander(19);
            textarea
                .keydown(function (e) {
                    if (e.keyCode === 13 && e.ctrlKey) {
                        $(this).val(function(i,val){
                            return val + "\n";
                        });
                    }
                })
                .keypress(function(e){
                    if (e.keyCode === 13 && !e.ctrlKey) {
                        textarea
                            .addClass('ui-autocomplete-loading')
                            .addClass('readonly')
                            .attr('disabled', 'disabled');
                        $.post(
                            '/data/common_handler.php?action=Discussion_Header::AJAX_U_AddComment',
                            {
                                discussion_header_id:discussion_header_id,
                                parent_discussion_id:parent_discussion_id,
                                comment:textarea.val()
                            },
                            function(threadEntry){
                                thread_entry_count += 1;
                                if(remove_on_post){
                                    textarea.remove();
                                    if(reply_link){
                                    	reply_link.toggle();
									}
								} else {
                                    textarea.val('');
                                    textarea
                                        .removeClass('ui-autocomplete-loading')
                                        .removeClass('readonly')
                                        .removeAttr('disabled')
                                    ;
								}
                                buildThreadEntry(threadEntry);
                            },
                            'json'
                        );
                        return false;
                    }
                })
                .keyup(function (e){
                    if (e.keyCode === 17) {
                        ctrlKeyDown = false;
                    }
                });
			var button = $('<a href="javascript:" class="pull-right"><i class="material-icons small">send</i></a>');

			button.click(function(){
				textarea
					.addClass('ui-autocomplete-loading')
					.addClass('readonly')
					.attr('disabled', 'disabled');
				$.post(
					'/data/common_handler.php?action=Discussion_Header::AJAX_U_AddComment',
					{
						discussion_header_id:discussion_header_id,
						parent_discussion_id:parent_discussion_id,
						comment:textarea.val()
					},
					function(threadEntry){
						thread_entry_count += 1;
						if(remove_on_post){
							current_textarea = false;
							div.remove();
						} else {
							textarea.val('');
							textarea
								.removeClass('ui-autocomplete-loading')
								.removeClass('readonly')
								.removeAttr('disabled')
							;
						}
						buildThreadEntry(threadEntry);
					},
					'json'
				);
			});
            div.append(textarea);
            div.append(button);
            if(remove_on_post){
				var cancel = $('<a href="javascript:" class="pull-right"><i class="material-icons small red">close</i></a>');
				cancel.click(function(){
					current_textarea = false;
					div.remove();
					if(reply_link){
						reply_link.toggle();
					}
				});
				div.append(cancel);
			}
            return div;
		}

        function buildThreadEntry(threadEntry){
        	if($('#discussion_thread_'+threadEntry.discussion_id).length == 0){
        		var thread = $('<div class="media message"/>');
				if("0"==threadEntry.is_read){
					thread.addClass('unread');
				}
				var reply_link = $('<a href="javascript:"><i class="material-icons small">reply</i></a>');

				reply_link.click(function(){
					var textarea = buildReplyTextArea(threadEntry.discussion_header_id, threadEntry.discussion_id, true, reply_link);
					thread.find('.media-body:first').append(textarea);
					current_textarea = textarea.find("textarea");
					current_textarea.focus();
				});

				thread.attr('id', 'discussion_thread_'+threadEntry.discussion_id);
				thread.append($('<img class="d-flex mr-3 mini-portrait"/>').attr('src', threadEntry.user.portrait_url));
				thread.append(
					$('<div class="media-body"/>')
						.append(
							$('<h5>')
								.html(threadEntry.user.school_name + '&nbsp;')
								.append($('<sup class="message_timestamp">').text(threadEntry.human_time))
								.append($('<div style="float:right;font-weight:normal;">').append(reply_link))
						)
						.append(threadEntry.comment)
				);
				if(threadEntry.is_current_user){
					thread.css('background-color', '#bfffa3');
				}

				if('0'==threadEntry.parent_discussion_id){
					$(discussion_container).append(thread);
				} else {
					$('#discussion_thread_'+threadEntry.parent_discussion_id).find('.media-body:first').append(thread);
				}
			}
        }

        if(undefined==entity_key||undefined==entity_name){

        } else {
//Initial building
            clearInterval(timeoutID);
            loadDiscussion(true);
            timeoutID = setInterval(updateDiscussionCheck, 30000);
        }
    });
}

function reloadDiscussion(container_id){
	$('div.reply_area').remove();
	$('#'+container_id).discussion();
}

function loadDiscussion(param){
	var container_id = param.container_id;
	var entity_name = param.entity_name;
	var entity_key = param.entity_key;

	$('#'+container_id).data('param', param);
	if(0==$('#'+container_id).length){
		console.log('Discussion container "#'+container_id+'" not found');
	} else{

	}
}

$.fn.slideOver = function(a){
	var panel_id = buildID();
	standardCloseSlideOver =  function (){
		is_dirty = false;
		$(this).html("&nbsp;");
		$('.cd-panel').removeClass('is-visible');
		$('.cd-panel').remove();
        $("body").removeClass("with-overlay");
		customCloseAction();
	}

	var open = function _open(){}
	customCloseAction = function(){}

	var has_button_pane = false;
	if("object" == typeof a||undefined == a){
		var content_container = $('<div class="cd-panel-container">');
		if("object" == typeof a){
			if('title' in a){
				content_container.append('<div class="cd-panel-header"><h1>'+a.title+'</h1></div>');
				$("body").addClass("with-overlay");
			}

			if('style' in a){
				content_container.addClass(a.style);
			}

			if('width' in a){
				content_container.css('width', a.width);
			}

			if(a.isWide){
				content_container.addClass('cd-panel-container--is-wide');
			}

			if('buttons' in a){
				$(this).find('.cd-panel-buttonpane').remove();

				var buttonpane = $('<div class="cd-panel-buttonpane"/>');
				var button_count = 0;

				for (var property in a.buttons) {
                    has_button_pane = true;
					if((typeof a.buttons[property]) == 'function'){
						if (a.buttons.hasOwnProperty(property)) {
							button_count += 1;
							var button = $("<button type='button'/>");

							button
								.click(a.buttons[property])
								.text(property);

							//Since it's first button, it assume it's the primary
							if(1==button_count) button.addClass('btn-primary');

							if('delete'==property.toLowerCase()){
								button.addClass('btn-danger');
							}else{
								button.addClass('pull-right');
							}
							buttonpane.append(button);
						}
					} else {
						button_count += 1;
						var _button = a.buttons[property];
						var button = $("<button type='button'/>");

						button
							.click(_button.click)
							.text(_button.label)
							.addClass(_button.class)
							;

						if(false!=_button.pull) {
							button.addClass('pull-right');
						}
						buttonpane.append(button);
					}
				}
			}

			if('open' in a){
				open = a.open;
			}

			if('close' in a){
				console.log(a);
				customCloseAction = a.close;
			}
		}

		content_container.append($('<div class="cd-panel-content">').append($(this)));
        if(has_button_pane){
            content_container.append(buttonpane);
		}

		$('body').append(
			$('<div class="cd-panel from-right">')
				.attr('id', panel_id)
				.on('click', function(event){
					if( $(event.target).is('.cd-panel') || $(event.target).is('.cd-panel-close') ) {
						if (is_dirty) {
							continue_proc = confirm("You haven't saved your changes. Are you sure you want to close this panel?");
							if (continue_proc) {
								event.preventDefault();
								standardCloseSlideOver();
							}
						} else {
							event.preventDefault();
							standardCloseSlideOver();
						}
					}
				})
				.append(content_container)
		);

		$(this).focus();
		$(this).ready(
			function(){
				$('.cd-panel').addClass('is-visible');
				open();
			}
		);
		$(this)
		 	.find(':input').change(
				function(){
					is_dirty = true;
					return true;
				}
			);
	} else if('close'==a){
		standardCloseSlideOver();
	}
}

$.fn.objectify = function()
{
	var o = {};
	var a = this.serializeArray();
	$.each(a, function() {
		var name = this.name;
		var idx = null;

		function x(){

		}

		if (this.name.indexOf('[') !== -1) {
			var start = this.name.indexOf('[');
			var end = this.name.indexOf(']');

			idx = this.name.substring(start + 1, end);
			name = this.name.substring(0, start);
		}
		if (o[name] !== undefined) {
			if (typeof o[name] === "object") {
				if(''==idx){
					o[name].push(this.value || '');
				} else {
					o[name][idx] = this.value || '';
				}
			} else {
				if (undefined==o[this.name]) {
					o[this.name] = '';
				}
				o[this.name] = this.value || '';
			}
		} else {
			if (idx !== null) {
				if(''==idx){
					o[name] = [];
					o[name].push(this.value || '');
				} else {
					o[name] = {};
					o[name][idx] = this.value || '';
				}
			} else {
				o[name] = this.value || '';
			}
		}
	});
	return o;
};

$(function(){
	$.ajaxSetup({type: "POST", cache:false, timeout: 3000000});
	$.datepicker.setDefaults({dateFormat:jquery_date_format, changeMonth:true, changeYear:true, yearRange:"-100:+100", duration:"", firstDay:1});
	$.timepicker.setDefaults({buttonImage:"/resources/clock.jpg"});
	buildCSSElements();
	buildFullCalendar();
	buildRTE();
	appendSpellChecker();
	buildPeopleSearchField();
	buildHouseholdSearchField();
	buildEmployerSearchField();
	buildCitySearchField();
	buildSubjectSearchField();
	buildPortraitTooltip();
	//buildCountrySearchField();
	initGradeValidators();
	addTargetToLinks();
	buildSelectComboBox();
	wait_message	= new waitMessage();
	//window.top.$('html, body').animate({scrollTop:0}, 'slow');
});

function popSlideover(element){
	var content = $(element).data("content");
	createDiv("tooltip_slideover_content");
	$("#tooltip_slideover_content").html(content);
	$("#tooltip_slideover_content").slideOver(
		{
			title:'',
			buttons:{
				"close":function(){$("#tooltip_slideover_content").slideOver("close")}
			},
			style: 'fit-content'
		}
	);
}

function addTargetToLinks() {
	var location = window.location,
		current = location.protocol + '//' + location.hostname;

	// ignore any non-http(s) link
	$('a[href^="http://"], a[href^="https://"]').each(function() {
		var $el = $(this),
			href = $el.attr('href');

		if (href && (href.substring(0, current.length) !== current)) {
			$(this).attr('target', '_blank');
		}
	});
}

function buildPlUploads(){
	$(".pluploadfield").each(function(field) {
		var field_id = $(this).attr("id");
		var container = $("div#" + field_id);
		var imagewidth = $(this).attr("image-width");
		var imageheight = $(this).attr("image-height");
		container.append("<a class='upload-button' id='button_" + field_id + "'>Upload file</a>").find("a").hide();
		if(typeof uploads != "object"){
			var uploads = {};
		}
		uploads[field_id] = new plupload.Uploader({
			runtimes: 'html5,html4',
			multi_selection: false,
			browse_button: 'button_' + field_id,
			url:'/data/upload.php?direct=1&width='+imagewidth+'&height='+imageheight,
			container : container[0],
			filters : {
				max_file_size : 5242880,
				mime_types: [
					{title : "CSV", extensions : container.data("types")}
				]
			},
			init: {
				PostInit: function() {
					container.removeClass("error").find("span").remove();
					container.find("a").show();
					if(container.data("value") != ""){
						container.find("a").hide();
						var filename = $("<span class='file-name'>").prop("title", container.data("filename")).html(container.data("filename"));
						var progress = $("<div class='loading'><div class='bar'></div><div class='percent'></div></div>");
						var delete_button = $("<div class='ui-red-icon ui-icon-close pointer'>").click(function(){
							container.find('.file-name').remove();
							container.find("a").show();
							container.find(".loading").remove();
							container.find(".hidden_file_field").remove();
						});
						var hidden_file_field = $('<input>')
							.attr('id', field_id + 'file')
							.attr('class', 'hidden_file_field')
							.attr('type', 'hidden')
							.attr('name', field_id)
							.attr('value', parseInt(container.data("value")));
						container.append(filename).prepend(progress).append(delete_button).append(hidden_file_field);
						container.find(".bar").css("width", "100%").css("background-color", "#999");
					}
				},
				Error: function(up, err) {
					var message;
					switch (err.code) {
						case -601: 	// filetype error
							message = 'File ' + err.file.name + ' is not a valid mime type for this upload';
						break;
						case -600: 	// filesize error
							message = 'File ' + err.file.name + ' is larger than the maximum allowed size of 5MB';
						break;
						default:
							message = 'There was a problem processing ' + err.file.name;
						break;
					}
					alert(err.message + ' ' + message);
				},
				FilesAdded: function(up, files) {
					container.find("a").hide();
					container.find(".moxie-shim").hide();
					plupload.each(files, function(file) {
						var id		= file.id;
						var filename = $("<span class='file-name'>").prop("title", file.name).html(file.name);
						var delete_button = $("<div class='ui-red-icon ui-icon-close pointer'>").click(function(){
							up.removeFile(file);
							container.find('.file-name').remove();
							container.find("a").show();
							container.find(".loading").remove();
							container.find(".hidden_file_field").remove();
						});
						var progress = $("<div class='loading'><div class='bar'></div><div class='percent'></div></div>");
						container
							.append(filename)
							.prepend(progress)
							.append(delete_button);
					});
					$('#' + field_id + '_file_progress').hide().html('');
					up.start();
				},
				UploadProgress: function(up, file) {
					is_uploading = true;
					var percent = file.percent;
					if (percent > 99) percent = 99;
					$('div#' + field_id + ' .loading .bar').css("width", percent + "%");
					$('div#' + field_id + ' .loading .percent').html(percent + "%");
				},
				FileUploaded: function(up, file, object) {
					is_uploading = false;
					var id		= file.id;
					try {
						response = eval(object.response);
					} catch(err) {
						response = eval('(' + object.response + ')');
					}
					// create new hidden inputs in the form for file_ids
					var hidden_file_field = $('<input>')
						.attr('id', field_id + 'file_' + file.id)
						.attr('class', 'hidden_file_field')
						.attr('type', 'hidden')
						.attr('name', field_id)
						.attr('value', parseInt(response.id));
					container.append(hidden_file_field);
					container.find('.loading .bar').css("background-color", "#999").html("");
					container.find('.loading .percent').remove();
				}
			}
		});
		uploads[field_id].init();
	});
}
var all_page_grids = [];
function buildSlickGrid(_options, elementSelector){
    var options = { // defaults
        checkboxSelector: true,
        rowHeight: 50,
        fullWidthRows: false,
        autoHeight: true,
		ajaxRequestType: 'GET'
    };
    if(_options){ // overide defaults?
        for(var i in _options) {
            if(options.hasOwnProperty(i)){
                options[i] = _options[i];
            }
        }
    }
    all_page_grids		= [];
    if(!elementSelector){
        elementSelector = ".slickgrid_container";
    }

    if($(elementSelector).length){
        wait_message.show();
    }

    setTimeout(function () {
        $(elementSelector).each(function(i, container){
        	if("GET"==options.ajaxRequestType){
				var param = $(container).attr('href');
				var url = -1==param.indexOf('::AJAX_U_') ? "/data/admin_data.php" : "/data/common_handler.php";
			}else if("POST"==options.ajaxRequestType){
				var param = $(container).data("params");
				var url = -1==param.action.indexOf('::AJAX_U_') ? "/data/admin_data.php" : "/data/common_handler.php";
			}


            $.ajax({
                dataType:"json", url:url, data: param, type:options.ajaxRequestType, async: false,
                success: function(grid_param){
                    // $(container).parent().css('padding', '10px');
                    var dataView = new Slick.Data.DataView();
                    var columnFilters = {};
                    var grid;

                    var footer_id = buildID();
                    var footer = $('<div class="slick-footer"></div>').attr('id', footer_id);

                    function filter(item) {
                        for (var columnId in columnFilters) {
                            if (columnId !== undefined && columnFilters[columnId] !== "") {
                                var c = grid.getColumns()[grid.getColumnIndex(columnId)];
                                var cell_value = item[c.field];
                                var search_string = columnFilters[columnId];

								if(null == cell_value){
									return false;
								} else if(c.dropdownFilter&&cell_value!=search_string){
									return false;
								} else if (cell_value.toLowerCase().indexOf(search_string.toLowerCase()) == -1) {
									return false;
								}


                            }
                        }
                        return true;
                    }

                    $(grid_param.columns).each(function(i, column){
                        if(column.hasOwnProperty("formatter")){
                            column.formatter = new Function("row", "cell", "value", "columnDef", "dataContext", column.formatter);
                        }
                    });

                    if (options.checkboxSelector) {
                        var checkboxSelector = new Slick.CheckboxSelectColumn({cssClass: "slick-cell-checkbox",searchable:false});
                        grid_param.columns.unshift(checkboxSelector.getColumnDefinition());
                    }

                    grid_param.options.rowHeight = options.rowHeight;
                    grid_param.options.fullWidthRows = options.fullWidthRows;

                    grid = new Slick.Grid(container, dataView, grid_param.columns, grid_param.options);
                    $(container).data("slickGrid", grid);

                    function buildFooter(){
                        selection_count = grid.getSelectedRows().length;
                        selection_message = 0==selection_count ? '' : selection_count + ' row(s) selected / ';
                        displayed_count = grid.getData().getPagingInfo().totalRows;
                        $(footer).text(selection_message + displayed_count + ' row(s) displayed');
                    }

                    grid.setSelectionModel(new Slick.RowSelectionModel({selectActiveRow: false}));
                    if(options.checkboxSelector){
                        grid.registerPlugin(checkboxSelector);
                    }
                    dataView.syncGridSelection(grid, true);
                    var columnpicker = new Slick.Controls.ColumnPicker(grid_param.columns, grid, grid_param.options);

                    grid.onSort.subscribe(function(e, args){
                        var field = args.sortCol.field;
                        dataView.sort(function(a, b){


                            // Handle sorting by date
                            if (args.sortCol.is_date) {
                                var aDate = $.datepicker.parseDate(jquery_date_format, a[field]),
                                    bDate = $.datepicker.parseDate(jquery_date_format, b[field]);

                                if (aDate < bDate) {
                                    result = 1;
                                } else if (aDate > bDate) {
                                    result = -1;
                                } else {
                                    result = 0;
                                }

                            } else {

                                // Handle numeric sorting
                                if(args.sortCol.orderType == "number"){
                                    var value = a[field];
                                    value_a = currencyToDouble(a[field]);
                                    value_b = currencyToDouble(b[field]);
                                    var result = value_a > value_b ? 1 : value_a < value_b ? -1 : 0;
                                }else{
                                    // Default to string sorting
                                    a[field] = null==a[field] ? '' : a[field];
                                    b[field] = null==b[field] ? '' : b[field];
                                    var result = a[field].toLowerCase() > b[field].toLowerCase() ? 1 : a[field].toLowerCase() < b[field].toLowerCase() ? -1 : 0;
                                }

                            }
                            return args.sortAsc ? result : -result;
                        });
                        grid.invalidate();
                    });


                    dataView.onRowCountChanged.subscribe(function (e, args) {
                        buildFooter();
                        grid.updateRowCount();
                        grid.render();
                    });


                    dataView.onRowsChanged.subscribe(function (e, args) {
                        grid.invalidateRows(args.rows);
                        grid.render();
                    });

                    grid.onSelectedRowsChanged.subscribe(
                        function() {
                            buildFooter();
                        }
                    );

                    $(grid.getHeaderRow()).delegate(":input", "change keyup", function (e) {
                        var columnId = $(this).data("columnId");
                        if (columnId != null) {
                            columnFilters[columnId] = $.trim($(this).val());
                            dataView.refresh();
                        }
                    });

                    grid.onHeaderRowCellRendered.subscribe(function(e, args) {
                        $(args.node).empty();
                        if(''!==args.column.editor){
                            args.column.editor	= eval(args.column.editor);
                        }
                        if(args.column.searchable){
                            if(args.column.is_date){
                                $("<input type='text' class='datepicker_wc'>")
                                    .attr("placeholder", args.column.name)
                                    .data("columnId", args.column.id)
                                    .val(columnFilters[args.column.id])
                                    .appendTo(args.node);
                            }else{
                                $("<input type='text' class='header_search_field'>")
                                    .attr("placeholder", args.column.name)
                                    .data("columnId", args.column.id)
                                    .val(columnFilters[args.column.id])
                                    .appendTo(args.node);
                            }
                            if(args.column.dropdownFilter){
                                var searchfield = $(args.node).find(".header_search_field");
                                var select = $("<select class=\"slick-grid-custom-filter\" />");
                                $("<option />", {value: "", text: "all"}).appendTo(select);
                                $.each(args.column.dropdownOptions, function( index, value ) {
                                    $("<option />", {value: value.label, text: value.label}).appendTo(select);
                                });

                                searchfield.hide().after(select);
                                $(args.node).find("select").change(function(){
                                    searchfield.val($(this).val());
                                    searchfield.trigger("keyup");
                                });

                                if(undefined!==args.column.defaultVal){
                                    select.val(args.column.defaultVal).trigger("change");
                                }
                            }
                        }
                    });


                    grid.init();

                    dataView.beginUpdate();
                    dataView.setItems(grid_param.data);
                    dataView.setFilter(filter);
                    dataView.endUpdate();

                    all_page_grids.push(grid);
                    buildFooter();
                    $(container).append(footer);
                    wait_message.hide();
//
                    //grid.setHeaderRowVisibility(false);
                }
            });
        });

    }, 1);
}

function openMultiSubjectBrowser(field_name){
	createDiv('subject_browser');

	var subject_id_list	= [];
	$("#"+field_name+"_container input").each(function(i, input){
		subject_id_list.push($(input).val());
	});

	$('#subject_browser').load('/data/admin_data.php?action=Field::AJAX_BuildSubjectBrowser', {'subject_id[]':subject_id_list}, function(){
		$('#subject_browser').dialog({modal:true, position:'top', width:700, resizable:false, title:'Select subject(s)', buttons:{
			'Select':function(){
				$('#'+field_name+'_container').html("");
				$("#mss_target_subject_list option").each(function(i, option){
					$('#'+field_name+'_container').append($('<div>').html($(option).text()).append($("<input type='hidden'>").attr('name', field_name+'[]').val($(option).val())));
				});

				$('#subject_browser').dialog('close');
			},
			'Cancel':function(){
				$('#subject_browser').dialog('close');
			},
		}});
	});
}

function sortSelect(select_id){
	var val			= $('#'+select_id).val();
	var options		= $('#'+select_id).find('option');

	var arr			= options.map(function(_, o) { return { t: $(o).text(), v: o.value }; }).get();
	arr.sort(function(o1, o2) {
		return o1.t > o2.t ? 1 : o1.t < o2.t ? -1 : 0;
	});

	options.each(function(i, o) {
	  o.value = arr[i].v;
	  $(o).text(arr[i].t);
	});
	$('#'+select_id).val(val);
}

function isJSONEmpty(obj){
	for(var i in obj) { return false; } return true;
}

function fetchMSSSubjectList(){
	var class_level_id	= $('#mss_class_level_id').val();
	$.getJSON('/data/admin_data.php?action=Subject::AJAX_GetSubjectListByClassLevelID', {class_level_id:class_level_id}, function(subject_list){
		populateSelectFromJSONList(subject_list, 'mss_source_subject_list', false);
	})
}

function displaySingleSubjectSelect(field_name){
	createDiv('subject_select_container');
	var subject_id = $("#"+escapeSB(field_name)).val();
	var role_id = $("#"+escapeSB(field_name)).attr('role_id');
	$("#subject_select_container").load(
		'/data/admin_data.php?action=Field::AJAX_BuildSingleSubjectSelect',
		{subject_id:subject_id, field_name:field_name,role_id:role_id},
		function(){
			$("#subject_select_container").dialog({
				modal:true,position:'top',title:'Select subject',width:400,
				buttons:{
					'confirm':function(){
						var new_subject_id = $("#sss_subject_id").val();
						var new_subject_label = $("#sss_subject_id option:selected").text();
						$("#"+escapeSB(field_name)).val(new_subject_id).change();
						$("#mock_"+escapeSB(field_name)).val(new_subject_label);
						$("#subject_select_container").dialog("close");
					},
					'cancel':function(){
						$("#subject_select_container").dialog("close");
					}
				}
			});
		});
}

function sssFetchSubjectList(){
	var class_level_id		= $("#sss_class_level_id").val();
	$.getJSON('/data/admin_data.php?action=Subject::AJAX_GetSubjectListByClassLevelID', {class_level_id:class_level_id}, function(subject_list){
		populateSelectFromJSONList(subject_list, 'sss_subject_id', false);
	})
}

function addMSSSubject(){
	var target_values	= [];

	$("#mss_target_subject_list option").each(function(i, option){
		target_values.push($(option).val());
	});


	$("#mss_source_subject_list option:selected").each(function(i, option){
		if(-1==$.inArray($(option).val(), target_values)){
			$(option).appendTo($("#mss_target_subject_list"));
		}

	});
}

function removeMSSSubject(){
	$("#mss_target_subject_list option:selected").each(function(i, option){
		$(option).remove();
	});
}

function toggleFutureCourses(){
	$(".futurecourse").toggle();
   	var text = $("#togglefuturecourses").text();
   	$("#togglefuturecourses").text(text == "Show future courses" ? "Hide future courses" : "Show future courses");
}

function getURLParameter(url, name) {
	return decodeURI(
		(RegExp(name + '=' + '(.+?)(&|$)').exec(url)||[,null])[1]
	);
}

function getUrlVars(){
	var vars = [], hash;
	var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
	for(var i = 0; i < hashes.length; i++)
	{
		hash = hashes[i].split('=');
		vars.push(hash[0]);
		vars[hash[0]] = hash[1];
	}
	return vars;
}

function SQLToLocalDate(date){
	if(undefined==date||null==date||'0000-00-00'==date){
		return '';
	}else{
		var atomised_date = date.split('-');
		if(3==atomised_date.length){
			var year = atomised_date[0];
			var monthIndex = atomised_date[1]-1;
			var day = atomised_date[2];
			return $.datepicker.formatDate(jquery_date_format, new Date(year, monthIndex, day));
		}else{
			return '';
		}
	}
}

function SQLToLocalTime(sql_time){
	return sql_time === null ? '' : sql_time.substring(0, 5);
}


function JSToLocalDate(date){
    return $.datepicker.formatDate(jquery_date_format, date);
}

function JSToSQLDate(date){
	if(undefined==date||null==date){
		ret	= '0000-00-00';
	}else{
		year = date.getFullYear();
		month = '0'+(date.getMonth()+1);
		month = month.substring(month.length-2);
		day_no = '0'+date.getDate();
		day_no = day_no.substring(day_no.length-2);
		ret = year + '-' + month + '-' + day_no;
	}
	return ret;
}

function initGradeValidators(){
	jQuery.validator.addMethod(
		"pc_grade",
		function(value, element){
			var ret				= false;
			var valid_values	= $(element).attr("valid_values");
			var max_value		= $(element).attr("max_value");
			var decimal			= $(element).attr("decimal");
			max_value			= max_value ? new Number(max_value) : 100;
			var error_message	= "";

			error_message		= valid_values ? '0-' + max_value + ',' + valid_values : '0-' + max_value;
			if(!isNaN(value)){
				value				= new Number(value);
				if(0<=value&&max_value>=value){
					if(decimal){
						var resolution = new Number(decimal);
						if(resolution=='0.01'){
							//numberfixed=number.toFixed(2)
							if(value==value.toFixed(2)){
                                ret				= true;
							}else{
                                error_message	= 'Invalid decimal format';
							}
						}else{
                            if((value*10) % (resolution*10) === 0){
                                ret				= true;
                            }else{
                                error_message	= 'Invalid decimal format';
                            }
                        }
					}else if(!decimal){
						ret = true;
					}
				}
			}else if(valid_values){
				valid_values	= valid_values.split(',');
				$(valid_values).each(function(i, valid_value){
					if(value.toUpperCase()==valid_value.toUpperCase()){
						ret = true;
						$(element).val(valid_value);
					}
				});
			}
			this.settings.messages[element.name] = error_message;
			return ret;
		},
		''
	);

	jQuery.validator.addMethod(
		"check_length",
		function(value, element){
			var ret			= false;
			var min_length  = $(element).attr("min_char");
			var max_length  = $(element).attr("max_char");

			value			= value.replace(/(<([^>]+)>)/ig,"").trim();
			if(value.length<=max_length){
				ret			= true;
			}
			this.settings.messages[element.name] = "You've exceeded the character limit of " + max_length;
			return ret;
		}, ''
	);

	jQuery.validator.addMethod("dependent_element",
		function(value, element){
			var ret					= true;
			var dependant_element	= $(element).attr("dependent_element");
			var error_message		= "";
			var dependent_value		= $("#"+dependant_element).val();

			if(''==dependent_value&&''==value){
				ret 				= false;
			}
			return ret;
		}, ''
	);
}

function evalCourseSessionMatch(){
	var course_id	= $('#target_course_id').val();
	$.getJSON(
		'/data/admin_data.php?action=Grade_Report_Session::AJAX_GetExamListByCourseID',
		{
			course_id:course_id
		},
		function(session_list){
			$('.session_map').each(function(i, field){
				var id		= $(field).attr('id');
				var value	= $(field).attr('original_session_id');
				populateSelectFromJSONList(session_list, id, true);
				$(field).val(value);
			});
		}
	);
}

function setSETime(start_field_id, end_field_id, start_value, end_value){
	$("#"+start_field_id).val(start_value);
	$("#"+end_field_id).val(end_value);
	$("#"+end_field_id).trigger('change');
}

function mockReload(){
	location.replace(location.href);
}

function buildID(){
	return "ID" + Math.floor( Math.random()*99999 );
}

function printEmergencySheet(){
	var user_id	= $("#user_id").val();
	window.open("/content/student/emergency_sheet.php?student_id="+user_id);
}

function addUserEvent(event_category_id){
	createDiv("event_container");
	$("#event_container").load("/data/admin_data.php?action=UserEvent::AJAX_BuildAddEventUI",{event_category_id:event_category_id}, function(){
		$("#event_container").dialog({modal:true, resizable:false,position:"top", width:600, title:"add event",
		buttons:{
			"create":function(){
				var user_id				= $("#user_id").val();
				var event_date			= $("#ue_event_date").val();
				var even_type_id		= $("#ue_even_type_id").val();
				var event_description	= $("#ue_event_description").val();
				var error_msg			= "";

				error_msg				= ""==event_date		? " - The user is missing\n" : "";
				error_msg				= ""==event_date 		? " - The event date is missing\n" : "";
				error_msg				= ""==even_type_id 		? " - The event type is missing\n" : "";
				error_msg				= ""==event_description ? " - The event description is missing\n" : "";

				if(""!=error_msg){
					alert("The following error(s) have occurred\n\n"+error_msg+"\nCorrect the errors and resubmit");
				}else{
					$.post("/data/admin_data.php?action=UserEvent::AJAX_ProcessAddEventPost",{user_id:user_id, event_date:event_date, even_type_id:even_type_id, event_description:event_description}, function(){
						$("#event_container").dialog("destroy");
					});
				}
			},
			"cancel":function(){
				$("#event_container").dialog("destroy");
			}
		}});
	});
}

function editEmployment(employee_id){
	createDiv("employee_container");
	$("#employee_container")
		.load("/data/admin_data.php?action=Employment::AJAX_BuildEmploymentScreen", {employee_id:employee_id}, function(){
			$("#employee_container").dialog({modal:true, position:"top", width:780, height:400, title:"Edit employment details",
				close:function(){
					$("#employee_container").dialog("destroy").remove();
				},
				buttons:{
					"save":function(){
						$.getJSON("/data/admin_data.php?action=Employment::AJAX_EmploymentValidate", $("#employment_edit_form").serialize(), function(errors){
							var error_msg   = "";
							$(errors).each(function(i, error){
								error_msg   += error;
							});

							if(""==error_msg){
								$.post("/data/admin_data.php?action=Employment::AJAX_ProcessPost", $("#employment_edit_form").serialize(), function(last_employer_name){
									$("#employment_mock_field").html(last_employer_name);
									$("#employee_container").dialog("close");
								});
							}else{
								alert("The following validation error(s) have occurred:\n\n" +error_msg+"\nCorrect the listed error(s) and resubmit your changes.");
							}
						});
					},
					"cancel":function(){
						$("#employee_container").dialog("close");
					}
				}});
			});
}

function addEmployment(employee_id){
	$("#no_data").remove();
	$.get("/data/admin_data.php?action=Employment::AJAX_BuildNewEmployer&employee_id="+employee_id, function(row){
		$("#employer_table tbody").append($(row).show("slow"));
		buildEmployerSearchField();
	});
}

function deleteNewEmployment(id){
	$("#"+id).remove();
}

function deleteEmployment(employment_id){
	if(confirm("Are you sure you want to delete this employment record?\n\nThe deletion cannot be undone.")){
		$.getJSON("/data/admin_data.php?action=Employment::AJAX_DeleteEmployment", {employment_id:employment_id}, function(){
			$("#row_"+employment_id).remove();
		});
	}
}

function loadTypeIIICalendar(container_id, course_id_list, teacher_id){
	var week_start	= $("#type_III_week_select").val();
	var teacher_id_param = "";
	if(undefined!=teacher_id){
		teacher_id_param = "&teacher_id="+teacher_id;
	}
	console.log(teacher_id_param);
	$("#" + container_id)
		.addClass('ui-autocomplete-loading')
		.load("/data/common_handler.php?action=Course_Schedule::AJAX_U_BuildTypeIIICalendar&course_id_list="+course_id_list.join(",")+"&week_start="+week_start+teacher_id_param, function(){
			$("#" + container_id).removeClass('ui-autocomplete-loading');
		});
}

function loadUserActivity(user_id){
	createDiv("user_activity");
	$("#user_activity").load("/data/admin_data.php?action=UserSession::AJAX_BuildUserActivityTable&user_id="+user_id, function(){
		$("#user_activity").slideOver({title:"User activity",
			buttons:{
				"close":function(){$("#user_activity").slideOver("close")}
			}
		});
	});
}

function validateFields($el){
	var $required = $el.find('.required'),
		$validate = $el.find('.validate'),
		hasErrors = false
	;

	$required.removeClass('error');
	$required.each(function(i, field) {
		var $field = $(field);

		if($field.val() == '') {
			hasErrors = true;
			$field.addClass('error');
		}
	});

	$validate.each(function(i, field) {
		var $field = $(field),
			value = $field.val()
		;

		if ($field.hasClass('integer') === true) {
			var tmp = parseInt(value, 10);

			if (tmp != value) {
				hasErrors = true;
				$field.addClass('error');
			}
		}
	});

	if (hasErrors === true) {
		alert('One or more fields have failed validation, please correct the marked fields.');
	}

	return (hasErrors === false);
}

function loadUserHistory(user_id){
	createDiv("user_history");
	$("#user_history").load("/data/admin_data.php?action=UserEvent::AJAX_BuildUserEventsTable&user_id="+user_id, function(){
		$("#user_history").dialog({modal:true, position:"top", title:"User history", width:700, buttons:{
			"close":function(){$("#user_history").dialog("close")}
		}});
	});
}

function loadCourseAvg(user_id, course_id, school_year, course_label){
	createDiv("course_history");
	$("#course_history").load("/data/admin_data.php?action=Course::AJAX_BuildCourseAvgTable&course_id="+course_id+"&school_year="+school_year+"&user_id="+user_id, function(){
		$("#course_history").dialog({modal:true, position:"top", title:"Course average ("+course_label+")", width:700, height:600, buttons:{
			"close":function(){$("#course_history").dialog("close")}
		}});
	});
}

function buildCitySearchField(){
	$(".city_search_field")
		.autocomplete({
			minLength:2,
			source: function( request, response ) {
				$.getJSON("/data/admin_data.php?action=Student::AJAX_GetJSONCityListBySearch", {search_string: request.term}, response);
			}
		})
		.addClass("search_field");
}

function trimArray(contract_list, cutoff){
	var list 		 = [];
	if(undefined!=contract_list){
		var extra	 = contract_list.length-cutoff;
		if(extra>0){
			contract_list.splice(cutoff, extra, "and " + extra + " other entries");
		}

		$(contract_list).each(function(i, item){
			if(is_object(item)){
				list.push('\t- ' + item.label);
			}else{
				list.push('\t- ' + item);
			}
		});
	}

	return list;
}

function is_object(mixed_var) {
	if (Object.prototype.toString.call(mixed_var) === '[object Array]') {
		return false;
	}
	return mixed_var !== null && typeof mixed_var === 'object';
}

function buildSubjectSearchField(){
	$(".subject_search_field")
		.categorised_search({
			minLength:2,
			source: function( request, response ) {
				var target_field_id	= $(this.element[0]).attr('target_field_id');
				var role_id = $('#'+target_field_id).attr('role_id');
				$.getJSON("/data/admin_data.php?action=Subject::AJAX_GetJSONSubjectListBySearchString", {search_string: request.term, role_id:role_id}, response);
			},
			select: function(event, ui) {
				var target_field_id	= $(this).attr("target_field_id");
				$("#"+target_field_id).val(ui.item.id).change();
			}
		})
		.change(function(){
			var subject_label	= $.trim($(this).val());
			if(subject_label==''){
				var target_field_id	= $(this).attr("target_field_id");
				$("#"+target_field_id).val("");
			}
		});
}

function fetchStudentListByCourseID(source, course_id){
	$(source).qtip({
		content:{text: 'Loading...', ajax: {url: '/data/admin_data.php?action=Course_Student::AJAX_GetStudentList&course_id='+course_id, type: 'GET'}},
		position:{target: 'event', viewport: $(window), my: 'top middle', at:'bottom middle'},
		style:{tip:true, classes:'ui-tooltip-light'},
		show: {event: 'click', solo: true},	hide:'unfocus'
	});
	$(source).unbind('mouseenter mouseleave mouseover mouseout');
	return false;
}

function fetchStudentListByClassID(source, class_id){
	$(source).qtip({
		content:{text: 'Loading...', ajax: {url: '/data/admin_data.php?action=Klass_Student::AJAX_GetStudentList&class_id='+class_id, type: 'GET'}},
		position:{target: 'event', viewport: $(window), my: 'top middle', at:'bottom middle'},
		style:{tip:true, classes:'ui-tooltip-light'},
		show: {event: 'click', solo: true},	hide:'unfocus'
	});
	$(source).unbind('mouseenter mouseleave mouseover mouseout');
	return false;
}

function fetchDonationListByUserID(source, user_id, campaign_id){
	$(source).qtip({
		content:{text: 'Loading...', ajax: {url: '/data/admin_data.php?action=Donation::AJAX_GetDonationList&user_id='+user_id+'&campaign_id='+campaign_id, type: 'GET'}},
		position:{target: 'event', viewport: $(window), my: 'top middle', at:'bottom middle'},
		style:{tip:true, classes:'ui-tooltip-light'},
		show: {event: 'click', solo: true},	hide:'unfocus'
	});
	$(source).unbind('mouseenter mouseleave mouseover mouseout');
}

function deleteCampaignDonor(user_id){
	$("#"+user_id).remove();
	if(user_id) $("#deleted_campaign_donors").val($("#deleted_campaign_donors").val()+","+user_id);
	return false;
}

function fetchPledgedListByUserID(source, user_id, campaign_id){
	$(source).qtip({
		content:{text: 'Loading...', ajax: {url: '/data/admin_data.php?action=Donation::AJAX_GetPledgedList&user_id='+user_id+'&campaign_id='+campaign_id, type: 'GET'}},
		position:{target: 'event', viewport: $(window), my: 'top middle', at:'bottom middle'},
		style:{tip:true, classes:'ui-tooltip-light'},
		show: {event: 'click', solo: true},	hide:'unfocus'
	});
	$(source).unbind('mouseenter mouseleave mouseover mouseout');
}

function buildStudentSearchField(){
	$(".student_search_field")
		.categorised_search({
			minLength:3,
			source: function( request, response ) {
				var target_field_id	= $(this.element[0]).attr('target_field_id');
				target_field_id		= escapeSB(target_field_id);
				var role_id			= $('#'+target_field_id).attr('role_id');
				$.getJSON("/data/admin_data.php?action=Student::AJAX_GetStudentSearch", {search_string: request.term, role_id:role_id}, response);
			},
			select: function(event, ui) {
				var source_field_id	= $(this).attr("id");
				var target_field_id	= $(this).attr('target_field_id');
				$("#"+target_field_id).val(ui.item.id).change();
			}
		});

	$(".my_student_search_field")
		.categorised_search({
			minLength:3,
			change: function(event, ui) {
				if(''==$(this).val()){
					var target_field_id	= $(this).attr('target_field_id');
					target_field_id		= escapeSB(target_field_id);
					$("#"+target_field_id).val('').change();
				}
			},
			source: function(request, response) {
				var target_field_id	= $(this.element[0]).attr('target_field_id');
				target_field_id		= escapeSB(target_field_id);
				var role_id			= $('#'+target_field_id).attr('role_id');
				$.getJSON("/data/admin_data.php?action=Student::AJAX_GetMyStudentSearch", {search_string: request.term, role_id:role_id}, response);
			},
			select: function(event, ui) {
				var target_field_id	= $(this).attr('target_field_id');
				target_field_id		= escapeSB(target_field_id);
				$("#"+target_field_id).val(ui.item.id).change();
			}
		});
}

function buildCourseSearchField(){
	$('.course_search').each(function(i, field){
		$(field).autocomplete({
			minLength:2,
			source: function( request, response ) {
				var year_field 		= $(field).attr('year_field');
				var year 			= $(year_field).val();
				var target_field_id	= $(this.element[0]).attr('target_field_id');
				var role_id			= $('#'+target_field_id).attr('role_id');
				$.getJSON(
					'/data/admin_data.php?action=Course::AJAX_GetJSONCourseBySearch',
					{
						search_string		: request.term,
						override_limitations: $(field).attr('override_access'),
                        add_block_to_label	: $(field).attr('add_block_to_label'),
						role_id				: role_id,
						year				: year
					},
					response
				);
			},
			select: function(event, ui) {
				var target_field 	= $(field).attr('target_field_id');
				$('#'+escapeSB(target_field)).val(ui.item.id).change();
			}
		});
	});
}

function buildNewLocationSearchField(){
    $(".new_location_search_field").each(function(i, search_field){
        if('text'==$(search_field).prop('type')){
            var room_id = $(search_field).attr('room_id');
            var room_name = $(search_field).val();
            var role_id = $(search_field).attr('role_id');
            $(search_field).prop('type', 'hidden');
            $(search_field).val(room_id);
            var mock_field = $('<input class="search_field form-control">');
            mock_field.val(room_name);
            mock_field.categorised_search({
                minLength:2,
                source: function(request, response) {
                    $.getJSON("/data/admin_data.php?action=Room::AJAX_SearchRoomByLabel", {search_string: request.term, role_id:role_id}, response);
                },
                select: function(event, ui) {
                    $(search_field).val(ui.item.id).change();
                }
            });

            mock_field.change(function(){
                if(''==$(this).val()){
                    $(search_field).val('');
                }
            })
            $(search_field).after(mock_field);
        }
    });
}

function buildStaffSearchField(){
    $(".new_staff_search_field").each(function(i, search_field){
    	if('text'==$(search_field).prop('type')){
	        var user_id = $(search_field).attr('user_id');
            var user_name = $(search_field).val();
            var role_id = $(search_field).attr('role_id');
            $(search_field).prop('type', 'hidden').val(user_id);

	        var mock_field = $('<input class="search_field form-control">');
            mock_field.val(user_name);
            mock_field.categorised_search({
	            minLength:2,
	            source: function(request, response) {
	                $.getJSON("/data/admin_data.php?action=Contact::AJAX_GetSearchStaff", {search_string: request.term, role_id:role_id}, response);
	            },
	            select: function(event, ui) {
	                $(search_field).val(ui.item.id).change();
	            }
	        }).change(function(){
                if(''==$(this).val()){
                    $(search_field).val(0);
                }
            })
	        $(search_field).after(mock_field);
    	}
    });
}

function buildHouseholdSearchField(){
	$(".household_field")
		.categorised_search({
			minLength:3,
			source: function(request, response){
				var target_field_id	 = $(this.element[0]).attr('target_field_id');
				var role_id			 = $(this.element[0]).attr('role_id');
				$.getJSON("/data/admin_data.php?action=Contact::AJAX_GetHouseholdListBySearch", {search_string:request.term, role_id:role_id}, response);
			},
			select: function(event, ui) {
				var target_field_id = $(this).attr("target_field_id");
				$("#"+escapeSB(target_field_id)).val(ui.item.id).change();
			}
		})
		.change(function(){
			if(''==$(this).val()){
				var target_field_id = $(this).attr("target_field_id");
				$("#"+escapeSB(target_field_id)).val('').change();
			}
		})
		;
}

function buildEmployerSearchField(){
	$(".employer_search_field")
		.categorised_search({
			minLength:3,
			source: function(request, response){
				var target_field_id	 = $(this.element[0]).attr('target_field_id');
				target_field_id		 = escapeSB(target_field_id);
				var role_id			 = $('#'+target_field_id).attr('role_id');
				$.getJSON("/data/admin_data.php?action=Employer::AJAX_GetEmployerListBySearch", {search_string:request.term, role_id:role_id}, response);
			},
			select: function(event, ui) {
				var target_field_id = $(this).attr("target_field_id");
				$("#"+escapeSB(target_field_id)).val(ui.item.id).change();
			}
		});
}

function buildPeopleSearchField(){
	$(".people_search_field")
		.categorised_search({
			minLength:3,
			source: function(request, response){
				var target_field_id	 = $(this.element[0]).attr('target_field_id');
				target_field_id = escapeSB(target_field_id);
				var role_id = $('#'+target_field_id).attr('role_id');
				$.getJSON("/data/admin_data.php?action=Contact::AJAX_GetUserByNameSearch", {search_string: request.term, role_id:role_id}, response);
			},
			select: function(event, ui) {
				var user_id = ui.item.id;
				var real_field_id	= escapeSB($(this).attr("target_field_id"));
				$("#" + real_field_id).val(user_id).trigger('change');
			}
		})
		.change(function(){
			if(''==$(this).val()){
				var target_field_id = $(this).attr("target_field_id");
				$("#"+escapeSB(target_field_id)).val('').trigger('change');
			}
		});

	$(".multi_people_search_field").each(function(i, container){
		var search_field = $('<input style="width:auto;display: inline;border-bottom: 0px;border: 0;height: 20px;outline-color:transparent;background-color:transparent;display:none;"/>');
        search_field.focusout(function(){search_field.hide();});
		search_field
			.categorised_search({
				minLength:3,
				source: function(request, response){
					var role_id = $(container).attr('role_id');
					$.getJSON("/data/admin_data.php?action=Contact::AJAX_GetUserByNameSearch", {search_string: request.term, role_id:role_id}, response);
				},
				select: function(event, ui) {
					var user_id = ui.item.id;
					var field_name = $(container).attr('field_name');

					var div = $('<div>');
					div
						.text(ui.item.label)
						.append($('<input type="hidden">').val(ui.item.id).attr('name', field_name+'[]'))
						.append($('<span class="ui-grey-icon ui-icon-close pointer pull-right" style="margin-top: 2px;"/>').click(function(){div.remove();}))
						;
					$(container).prepend(div);
					search_field.val("");
                    $(container).trigger("change");
					return false;
				}
			});
		;
		$(container).append(search_field);
        $(container).click(function(){
            search_field.show();
            search_field.focus();
        });
	});
}

function evaluateDirt(){
	$('input:not(.dirt_check_exclude), select:not(.dirt_check_exclude), textarea:not(.dirt_check_exclude)').change(function() {markAsDirty();});
}

function markAsDirty(){
	if(!is_dirty){
		is_dirty				= true;
		window.onbeforeunload	= confirmExit();
	}
}

function confirmExit(){
	if(is_dirty){
		return "You've made changes to the current document but did not save them.\n\nClick 'OK' to exit and lose changes.\n\nClick 'Cancel' to stay on current page.";
	}else{
		return null;
	}
}

function markAsClean(){
	is_dirty	= false;
}

function buildCSSElements(){
	buildStudentSearchField();
	buildStaffSearchField();
	buildCourseSearchField();
	$("*:not(.mce-widget) > button:not(.ui-datepicker-trigger)").button();
	buildSubjectSearchField();
	$(".datetimepicker").datetimepicker({timeFormat: 'HH:mm',constrainInput: true});

	$.datepicker.setDefaults({
		firstDay: week_start_day
	});

	$(".datepicker").each(function(i, field){
		$(field)
			.addClass("pointer")
			.datepicker({minDate:$(field).attr('min_value'), maxDate:$(field).attr('max_value')});
	});

	$(".datepicker_woi").each(function(i, field){
		$(field)
			.addClass("pointer")
			.datepicker({minDate:$(field).attr('min_value'), maxDate:$(field).attr('max_value'), showOn:"focus"});
	});

	$(".datepicker_wc").each(function(i, field){
		$(field)
			.addClass("pointer")
			.datepicker({minDate:$(field).attr('min_value'), maxDate:$(field).attr('max_value'), showOn:"focus"});

		if(!$(field).hasClass('processed')){
			$(field).after($('<span class="ui-icon ui-icon-close pointer" style="float:right"></span>').click(function(){$(field).val('').change();}));
		}
	});

	$(".timepicker").timepicker();
	$(".tablesorter").tablesorter({dateFormat:tablesorter_date_format});
	buildTooltips();
}

function buildFullCalendar(){
	var user_id				= $('#user_id').val();
	var language_code		= $('#language_code').val();

	if(undefined==language_code){
		language_code = 'en';
	}

	var inc_appointment		= $('.full_calendar').attr('view_appointments')==1;
	var event_type_list		= {};
	$("#event_type_list input:checkbox:checked").each(function(){
		event_type_list[$(this).val()] = $(this).val();
	});

	if('mt'==language_code){
 		var monthNames = ['Jannar','Frar','Marzu','April','Mejju','Ġunju','Lulju','Awwissu','Settembru','Ottubru','Novembru','Diċembru'];
 		var monthNamesShort = ['Jannar','Frar','Marzu','April','Mejju','Ġunju','Lulju','Awwissu','Settembru','Ottubru','Novembru','Diċembru'];
 		var dayNames = ['Il-Ħadd','It-Tnejn','It-Tlieta','L-Erbgħa','Il-Ħamis','Il-Ġimgħa','Is-Sibt'];
 		var dayNamesShort = ['Il-Ħadd','It-Tnejn','It-Tlieta','L-Erbgħa','Il-Ħamis','Il-Ġimgħa','Is-Sibt'];
 		var buttonText = {
			prev: "<span class='fc-text-arrow'>&lsaquo;</span>",
			next: "<span class='fc-text-arrow'>&rsaquo;</span>",
			prevYear: "<span class='fc-text-arrow'>&laquo;</span>",
			nextYear: "<span class='fc-text-arrow'>&raquo;</span>",
			today: 'illum',
			month: 'xahar',
			week: 'ġimgħa',
			day: 'ġurnata'
		};
		var allDayText = "Il-ġurnata<br/>kollha";
	}else{
		var monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
		var monthNamesShort = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
		var dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
		var dayNamesShort = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
		var buttonText = {
			prev: "<span class='fc-text-arrow'>&lsaquo;</span>",
			next: "<span class='fc-text-arrow'>&rsaquo;</span>",
			prevYear: "<span class='fc-text-arrow'>&laquo;</span>",
			nextYear: "<span class='fc-text-arrow'>&raquo;</span>",
			today: 'today',
			month: 'month',
			week: 'week',
			day: 'day'
		};
		var allDayText = "all-day";
	}

	$('.full_calendar').fullCalendar({
		height: 		820,

		// locale
		monthNames: monthNames,
		monthNamesShort: monthNamesShort,
		dayNames: dayNames,
		dayNamesShort: dayNamesShort,
		buttonText: buttonText,
		allDayText: allDayText,

		defaultView: 	'agendaWeek',
		timeFormat: 	'H:mm{ - H:mm}',
		hiddenDays: calendar_hidden_day_list,
		minTime: 	calendar_day_start,
		maxTime: 	calendar_day_end,
		firstDay: 	week_start_day,
		columnFormat: {
			week: calendar_week_format,
		},
		header: {
			left: 	'prev,today,next',
			center: 'title',
			right: 	'month,agendaWeek,agendaDay'
		},
		events:{
			url: 	'/data/common_handler.php?action=Contact::AJAX_U_GetSchedule',
			type: 	'POST',
			data:{
				user_id 		 : 	user_id,
				inc_appointment  : 	inc_appointment,
				event_type_list  :  event_type_list
			}
		},
		eventAfterRender: function(event,element){
			if($(element).height()<12){
				$(element).height(12);
			}
		},
		eventRender: function(event, element) {
			var current_view	=  $('#calendar').fullCalendar('getView');
			if('agendaWeek'==current_view.name||'agendaDay'==current_view.name){
				switch(event.entry_type){
					case 'Course':

						var period_start_end	 = $(element).find('.fc-event-time').text();
						$(element)
							.find('.fc-event-time')
							.text(event.param_2)
							.append($('<sup>').text(period_start_end));

						var teacher_name_list	 = '';


						if(event.teacher_name_list){
							var wordArray 		 = event.teacher_name_list.split(", ");
							for( i = 0; i<wordArray.length; i++) {
								wordArray[i]	 = Initials(wordArray[i]);
							}
							teacher_name_list	 = wordArray.join(", ");
						}

						$(element)
							.find('.fc-event-title')
							.text(event.title);

						$(element).find('.fc-event-title').append($('<div class="fc-event-info">').text(teacher_name_list + ' - Room: ' + event.param_1));
					default:

						break;
				}
			}

			if('Course'==event.entry_type){
				element.qtip({
					content: {
						text:function(eventx, api){
							$.ajax(
								{
									url:'/data/common_handler.php?action=Contact::AJAX_U_BuildCourseScheduleBox',
									type:'GET',
									data:{
										date:event.sql_date,
										course_id:event.id,
										teacher_name_list:event.teacher_name_list,
										period_id:event.period_id,
										room_id:event.room_id,
										start_time:("0"+event.start.getHours()).slice(-2) + ":" + ("0"+event.start.getMinutes()).slice(-2),
                                        end_time:("0"+event.end.getHours()).slice(-2) + ":" + ("0"+event.end.getMinutes()).slice(-2)
									}
								})
								.done(function(html) {
									api.set('content.text', html);
								})
								.fail(function(xhr, status, error) {
									api.set('content.text', status + ': ' + error);
								});

							return 'Loading...';
						},
						title: event.title
					},
					style:{
						tip:true,
						classes:'ui-tooltip-light'
					},
					show:{
						event:'click',
						solo: true
					},
					hide: {
						event: 'unfocus'
					},
					position:{
						viewport: $(window),
						my: 'top center',
						at:'bottom center'
					}
				});
			}

			if('Exercise'==event.entry_type || 'TeacherExercise'==event.entry_type){
				if (event.is_student == false) {
					var parent_student_state = event.parent_state;
				}else if(event.is_student == true){
                    var parent_student_state = event.student_state;
				}
                var $title = element.find('.fc-event-title'),
                    className = 'check'
                ;

                if (parent_student_state === 'unread') {
                    className = 'mail-closed';
                } else if (parent_student_state === 'read') {
                    className = 'mail-open';
                    element.addClass('read');
                } else {
                    element.addClass('read');
                }

                element.addClass('exercise');
                element.attr('id', 'sedb_' + event.id + '_' + user_id);

                $title.prepend('<span class="state-icon ui-white-icon ui-icon-' + className + '" style="display: inline-block; float:none;"></span>');
			}
		},
		eventClick: function(event, jsEvent, view) {
			var id	= event.id;
			if('Appointment'==event.entry_type){
				if(parseFloat(event.is_author)==1){
                    editAppointment(id, "", "", "", "", "", parseFloat(event.is_author), true);
				}else{
                    readAppointment(id);
				}
			} else if('TeacherExercise'==event.entry_type) {
				loadTeacherExercise(id);
			} else if('Exercise'==event.entry_type){
				loadStudentExercise(id, user_id);
			}else if('Public event'==event.entry_type){
                createDiv("event_modal");
                $("#event_modal").load("/data/anonymous_handler.php?action=Event::AJAX_A_GetEventDetailsTable", {event_id:id}, function(){
                    $("#event_modal").dialog({modal:true, position:"top", resizable:false, width:500, title:"Event details", buttons:{
                        'close':function(){
                            $("#event_modal").dialog('close');
                        }
                    }});
                });
			}
		},
		dayClick: function(date, allDay, jsEvent, view) {
			var edit_mode	= $('.fc').attr('edit')=='true';
			if(edit_mode){
				var hour		= date.getHours();
				var minutes		= pad(date.getMinutes(), 2);
				var start_time	= hour + ':' + minutes;
				var end_time	= (hour+1) + ':' + minutes;
				editAppointment(0, user_id, formatDate(date), start_time, end_time, "", "TRUE");
			}
		},
		viewRender: function(){
			$("#calendar .fc-header-left #calendarDatepicker").remove();
			$("#calendar .fc-header").css("z-index", 100).css("position", "relative");
			$("#calendar .fc-header-left").append(' <span id="calendarDatepicker"><input type="text" class="datepicker pointer"></span>');
			$( "#calendarDatepicker input" ).datepicker({
				onSelect: function(date){
					var d = $.datepicker.parseDate(jquery_date_format, date);
					$("#calendar").fullCalendar('gotoDate', d.getFullYear(), d.getMonth(), d.getDate());
				}
			});
			$( "#calendarDatepicker input" ).datepicker('setDate', $("#calendar").fullCalendar("getDate"));
		}

	});
	$(".full_calendar").removeClass('full_calendar');
}

function buildTooltips(){
	$('[data-input-tooltip]').each(function() {
		var $el = $(this);
		var $label = $('[for="'+$el.attr('id')+'"]');
		$label.append($('<span>', {
			'class': 'tooltip ui-green-icon ui-icon-help',
			'title': $el.data('input-tooltip')
		}));
	});

	$(".tooltip").qtip({position:{target: 'event', viewport: $(window), my: 'top middle', at:'bottom middle'}, style:{tip:true, classes:'ui-tooltip-light'}, show: {event: 'click', solo: true}, hide:'unfocus'});
}

function shrinker(text, max_length, no_of_dots){
	no_of_dots	= undefined==no_of_dots ? 3 : no_of_dots;
	var ret		= text;
	var dots	= "........";
	if(text.length>max_length){
		ret	= text.substring(0, max_length-no_of_dots)+dots.substring(0, no_of_dots);
	}
	return ret;
}

function currencyToDouble(currency){
	var ret		= currency.replace(getLocalCurrency(), "");
	ret			= trim(ret.replace(",", ""));
	if(isNaN(ret)){
		return "";
	}else{
		return new Number(ret);
	}
}

function toCurrency(old_value, prepend_currency_symbol){
	prepend_currency_symbol	= undefined==prepend_currency_symbol ? false : prepend_currency_symbol;
	var ret		 = old_value;
	if(!isNaN(old_value)){
		var value	 = new Number(old_value);
		var strVal	 = ""+value.toFixed(2);

		strVal		+= '';
		x			 = strVal.split('.');
		x1			 = x[0];
		x2			 = x.length > 1 ? '.' + x[1] : '';
		var rgx		 = /(\d+)(\d{3})/;
		while (rgx.test(x1)) {
			x1		 = x1.replace(rgx, '$1' + ',' + '$2');
		}
		ret	=  x1 + x2;
	}
	return prepend_currency_symbol ? getLocalCurrency() + " " + ret : ret;
}

function openHelp(){
	var path	= location.pathname;
	top.createDiv("help_container");

	top.$("#help_container").load(
		"/data/common_handler.php?action=Help::AJAX_U_GetContentByPath",
		{path:path},
		function(){
			top.$("#help_container")
				.addClass("left")
				.dialog({
					title:"Help", position:['right','top'],
					close:function(){
						top.$("#help_container")
							.dialog("destroy")
							.removeClass("help_container")
					},
					buttons:{
						print:function(){window.open("/content/help/help_print.php?path="+location.pathname);},
						close:function(){top.$("#help_container").dialog("close");}
					}
				})
				.addClass("help_container");
			top.$("#help_container").css("overflow-y", "auto");
			top.$("#help_container").css("height", "300px");
			top.$("#help_container").parent().addClass("help_button");
		}
	);
}

function getPosition(number){
	var simple_label	= new Array("","1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th", "13th", "14th", "15th", "16th", "17th", "18th", "19th", "20th");
	return simple_label[number];
}

function myCustomExecCommandHandler(editor_id, elm, command, user_interface, value) {
	switch (command) {
		case "mceSpellCheck":
			markAsSpellChecked();
			break;
	}
	return false; // Pass to next handler in chain
}

function markAsNotSpellChecked(){
	$("#spell_check_marker")
		.css("background-color", "red")
		.css("color", "#fff")
		.text("spell check!");
}

function markAsSpellChecked(){
	$("#spell_check_marker")
		.css("background-color", "green")
		.css("color", "#fff")
		.text("spell checked");
}

function getTinyMCEStats(id) {
	var text		= $('#'+id).text();
	var regex		= /\s+/gi;
	var wordCount	= text.trim().replace(regex, ' ').split(' ').length;
	var totalChars	= text.length;
	var charCount	= text.trim().length;
	var charCountNoSpace = text.replace(regex, '').length;

	return {
		chars: charCount,
		words: wordCount
	};
}


	function displayStudentOverview(user_id, session_id, course_id){
		createDiv('student_overview_container');

		$('#student_overview_container').load(
			'/data/admin_data.php?action=Grade_Report_Contribution::AJAX_BuildStudentOverview',
			{user_id:user_id, session_id:session_id, course_id:course_id},
			function(){
				$('#student_overview_container').dialog({modal:true,position:'top',resizable:false, width:800, buttons:{'close':function(){$('#student_overview_container').dialog('close');}}});
			}
		);
	}

function appendCommentEditChecker(){
	$("textarea.commenteditcheck").each(function(i, item){
		var field_name 		= $(item).attr("data-comment-edit-check-field");
		var tinymce_field 	= tinyMce.get($(item).attr("id")).getElement();
		$(tinymce_field).keydown(function() {
			console.log( "pressed!" );
		});
	});
}

function appendSpellChecker(height){
	$("textarea.spellcheck")
		.css('width', '93%')
		.css('margin-right', '5px')
		.TextAreaExpander(20)
		.after('<button class="spellcheck micro_button" type="button"><span class="ui-red-icon ui-icon-check"/></button>');

	var spellchecker = new $.SpellChecker('textarea.spellcheck', {
		lang: 'en',
		parser: 'text',
		suggestBox: {
			position: 'above'
		},
		incorrectWords: {
			position: function(container) {
				this.after(container);
			}
		}
	});

	// Bind spellchecker handler functions
	spellchecker.on('check.success', function() {
		alert('There are no incorrectly spelt words.');
	});

	// Check the spelling
	$("button.spellcheck").click(function(e){
		spellchecker.check();
	});

	var tmp_height	  = undefined==height	 ? 180 : height;
	$("textarea.spellchecker").each(function(i, item){
		var toolbar_buttons = "removeformat,paste,link,unlink,";
        if(!$(this).hasClass("no-content-templates")){
            var toolbar_buttons = "ContributionTemplate," + toolbar_buttons;
        }

        if($(this).data("height") != undefined && parseFloat($(this).data("height")) > 0){
			var height = parseFloat($(this).data("height"));
		}else{
			var height = tmp_height;
		}
        var toolbar = toolbar_buttons;

		if(typeof replacement_tags != "undefined"){
			toolbar = 'replacementTags, '+toolbar_buttons;
		}
		$(this).tinymce({
			oninit : function(ed){
				ed.on('keyup', function(e) {
					if($(ed.getElement()).hasClass("commenteditcheck")){
						var field_name 		= $(ed.getElement()).attr("data-comment-edit-check-field");
						var contribution_id = $("#contribution_id").val();
						$("#"+field_name).val("1");
					}
				});
			},
			setup : function(ed) {
				ed.on('keyup', function(e) {
					markAsNotSpellChecked();
					var target_id		= escapeSB(ed.id);
					var stats 	 		= getTinyMCEStats(target_id);

					var text			= stats.words + " Words, " + stats.chars + " Characters";

					var container_id	= 'word_count_'+ed.id;

					if(!$("#"+escapeSB(container_id)).size()){
 						var html = "<div id='"+container_id+"'></div>";
 						$($("#" + ed.id.replace("[", "\\[").replace("]", "\\]"))).after(html);
 					}
					$('#'+escapeSB(container_id)).text(text).addClass('character_counter');
				});
				ed.on("change", function () {
 		            markAsDirty();
 		        });

				if(typeof replacement_tags != "undefined"){
					var menu = [];

					replacement_tags.forEach(function(tag_object){
						menu.push({
							text: tag_object.tag_label,
							onclick: function () {
								ed.insertContent(tag_object.tag);
							}
						});
					});

					ed.addButton('replacementTags', {
					  type: 'menubutton',
					  text: 'Replacement Tags',
					  icon: false,
					  menu: menu
					});
				}
			},
			cache_suffix					: "?v="+system_deploy_id,
			execcommand_callback			: "myCustomExecCommandHandler",
			statusbar						: false,
			entity_encoding					: "raw",
			verify_html						: false,
			script_url						: tinymce_lib_folder + "tinymce.min.js",
			content_css						: "/css/tinymce.css",
			height							: height,
 			selector 						: "textarea",
 			menubar 						: "code",
 			menubar 						: false,
 			skin 							: "lightgray",
 			plugins							: "tabfocus,ContributionTemplate,paste,link",
            paste_word_valid_elements		: "b,strong,i,em,h1,h2,ul,ol,li,p",
 			toolbar 						: toolbar,
			relative_urls					: false,
			convert_urls					: false,
            remove_script_host				: false,
            browser_spellcheck 				: true,
			valid_elements					: "@[id|class|style|title|dir<ltr?rtl|lang|xml::lang|onclick|ondblclick|"
											+ "onmousedown|onmouseup|onmouseover|onmousemove|onmouseout|onkeypress|"
											+ "onkeydown|onkeyup],a[rel|rev|charset|hreflang|tabindex|accesskey|type|"
											+ "name|href|target|title|class|onfocus|onblur],strong/b,em/i,strike,u,"
											+ "#p,-ol[type|compact],-ul[type|compact],-li,br,img[longdesc|usemap|"
											+ "src|border|alt=|title|hspace|vspace|width|height|align],-sub,-sup,"
											+ "-blockquote,-table[border=0|cellspacing|cellpadding|width|frame|rules|"
											+ "height|align|summary|bgcolor|background|bordercolor],-tr[rowspan|width|"
											+ "height|align|valign|bgcolor|background|bordercolor],tbody,thead,tfoot,"
											+ "#td[colspan|rowspan|width|height|align|valign|bgcolor|background|bordercolor"
											+ "|scope],#th[colspan|rowspan|width|height|align|valign|scope],caption,-div,"
											+ "-code,address,-h1,-h2,-h3,-h4,-h5,-h6,hr[size|noshade],-font[face"
											+ "|size|color],dd,dl,dt,cite,abbr,acronym,del[datetime|cite],ins[datetime|cite],"
											+ "object[classid|width|height|codebase|*],param[name|value|_value],embed[type|width"
											+ "|height|src|*],script[src|type],map[name],area[shape|coords|href|alt|target],bdo,"
											+ "button,col[align|char|charoff|span|valign|width],colgroup[align|char|charoff|span|"
											+ "valign|width],dfn,fieldset,form[action|accept|accept-charset|enctype|method],"
											+ "input[accept|alt|checked|disabled|maxlength|name|readonly|size|src|type|value],"
											+ "kbd,label[for],legend,noscript,optgroup[label|disabled],option[disabled|label|selected|value],"
											+ "q[cite],samp,select[disabled|multiple|name|size],small,"
											+ "textarea[cols|rows|disabled|name|readonly],tt,var,big"
		});
	});
}

function buildRichTextEditors(replacement_tags){
	$('.rich_text_editor').each(function(i, tinymce_textarea){
		var plugins = $(tinymce_textarea).data('plugins');
		var toolbar = $(tinymce_textarea).data('toolbar');
		var item_id = $(tinymce_textarea).attr('id');
		var height = $(tinymce_textarea).attr('height');
		var toolbar_config = $(tinymce_textarea).attr('toolbar');
		var resizeOption = ($(tinymce_textarea).attr('resize') === 'true')
			? true
			: (typeof $(tinymce_textarea).attr('resize') === 'undefined')
				? false
				: $(tinymce_textarea).attr('resize');

		if(typeof tinyMCE !== 'undefined'){
			try {
				tinyMCE.remove('#' + item_id);
			} catch (e) {
				console.log(e);
			}
		}
		setTimeout(
			function() {
				height = undefined==height ? 180 : height;
				if(undefined==plugins && undefined==toolbar) {
					switch (toolbar_config) {
						case 'none':
							plugins = '';
							toolbar = false;
							break;
						case 'minimal':
							plugins = "media,tabfocus,advlist,image,image imagetools,searchreplace,paste,table,visualchars,print,textcolor,charmap,table,code,link,DynamicContributionTemplate,fullscreen";
							toolbar = "bold italic underline,|,alignleft aligncenter alignright,|,forecolor,|,bullist,numlist,indent,link,DynamicContributionTemplate,fullscreen";
							break;
						default:
						case undefined:
						case 'full':
							plugins = "media,tabfocus,advlist,image,image imagetools,searchreplace,paste,table,visualchars,print,textcolor,charmap,table,code,link,fullscreen,pagebreak,DynamicContributionTemplate";
							toolbar = "bold italic underline,|,styleselect fontselect fontsizeselect,|,alignleft aligncenter alignright alignjustify,|,forecolor,bullist,numlist,indent,link,image,media,removeformat,table,DynamicContributionTemplate,code,fullscreen" ;
							break;
					}
				}
				if(typeof replacement_tags != "undefined"){
					toolbar = 'replacementTags, '+toolbar;
				}
				$(tinymce_textarea).tinymce({
					cache_suffix					: "?v="+system_deploy_id,
					script_url : tinymce_lib_folder + "tinymce.min.js", entity_encoding:"raw", verify_html:true, height:height, skin:"lightgray", language:"en",
					relative_urls : false, convert_urls : false, remove_script_host : false, tabfocus_elements : ':prev,:next', browser_spellcheck : true, paste_data_images: true, menubar : false,  forced_root_block : '',
                    image_title: true, automatic_uploads: true, file_picker_types: 'image',force_p_newlines : true,
					browser_spellcheck: true,
					file_picker_callback:function(cb, value, meta) {
                        var input = document.createElement('input');
                        input.setAttribute('type', 'file');
                        input.setAttribute('accept', 'image/*');

                        // Note: In modern browsers input[type="file"] is functional without
                        // even adding it to the DOM, but that might not be the case in some older
                        // or quirky browsers like IE, so you might want to add it to the DOM
                        // just in case, and visually hide it. And do not forget do remove it
                        // once you do not need it anymore.

                        input.onchange = function() {
                            var file = this.files[0];

                            var reader = new FileReader();
                            reader.onload = function () {
                                // Note: Now we need to register the blob in TinyMCEs image blob
                                // registry. In the next release this part hopefully won't be
                                // necessary, as we are looking to handle it internally.
                                var id = 'blobid' + (new Date()).getTime();
                                var blobCache =  tinymce.activeEditor.editorUpload.blobCache;
                                var base64 = reader.result.split(',')[1];
                                var blobInfo = blobCache.create(id, file, base64);
                                blobCache.add(blobInfo);

                                // call the callback and populate the Title field with the file name
                                cb(blobInfo.blobUri(), { title: file.name });
                            };
                            reader.readAsDataURL(file);
                        };

                        input.click();
					},
					plugins : plugins,
					toolbar : toolbar,
					resize: resizeOption,
					statusbar: (resizeOption),
					setup: function(editor) {
						if(typeof replacement_tags != "undefined"){
							var menu = [];

							replacement_tags.forEach(function(tag_object){
								menu.push({
									text: tag_object.tag_label,
									onclick: function () {
										editor.insertContent(tag_object.tag);
									}
								});
							});

							editor.addButton('replacementTags', {
							  type: 'menubutton',
							  text: 'Replacement Tags',
							  icon: false,
							  menu: menu
							});
						}
					}
				});
			},
			500
		);
	});
}

function destroyAllTinyMceInstances() {
	if (!(typeof tinymce === 'undefined')) {
		$.each( $(".spellchecker"), function( key, value ) {
			if ($(this).tinymce() !== null){
				$(this).tinymce().remove();
			}
		});
		tinymce.remove();
	}
}

function buildRTE(height, selector){
	height		= undefined==height		? 180 : height;
	selector	= undefined==selector	? "textarea.tinymce" : selector;
	var languages = {
		'en_GB': 'English (British)',
		'en_US': 'English (American)',
		'en_CA': 'English (Canadian)',
		'da': 'Danish',
		'nl': 'Dutch',
		'fi': 'Finnish',
		'fr_FR': 'French',
		'de': 'German',
		'it': 'Italian',
		'pl': 'Polish',
		'pt_BR': 'Portuguese',
		'es': 'Spanish',
		'sv': 'Swedish'
	};

	languages[default_language] = '+' + languages[default_language];
	var languageStr = '';

	for(var key in languages) {
		languageStr += languages[key] + '=' + key + ',';
	}

    if (!(typeof tinymce === 'undefined')) {
        var j = tinymce.editors.length;
        for (var i = 0; i < j; i++) {
            if (tinymce.editors[i]) {
                tinymce.remove("#" + tinymce.editors[i].id);
            }
        };
    }

	$(selector).tinymce({
		setup : function(ed) {
 		    ed.on("change", function () {
 		        markAsDirty();
 		    });
 		},

		cache_suffix					: "?v="+system_deploy_id,
		script_url						: tinymce_lib_folder + "tinymce.min.js",
		content_css						: "/css/tinymce.css",
		entity_encoding					: "raw",
		verify_html						: false,
		height							: height,
		statusbar						: false,
		//theme							: "advanced",
		skin							: "lightgray",
		//skin_variant					: "silver",
		language						: "en",
		menubar 						: false,
		plugins							: "tabfocus,advlist,image,image imagetools,searchreplace,paste,table,visualchars,print,textcolor,charmap,table,code,link",
		toolbar 						: "undo,redo,|,bold italic underline strikethrough,|,formatselect,|,alignleft aligncenter alignright,|,forecolor backcolor,|,bullist,numlist,|,outdent,indent,|,link,unlink,image,removeformat,|,table,|,media,code",
		//toolbar 						: "bold italic underline strikethrough,|,formatselect,|,alignleft aligncenter alignright alignjustify,|,forecolor backcolor,|,bullist,numlist,|,outdent,indent,|,link,unlink,image,|,removeformat,|,undo,redo,|,superscript,subscript,|,charmap,|,table,|,code,|, print",
		relative_urls					: false,
        convert_urls					: false,
        remove_script_host				: false,
		tabfocus_elements				: ':prev,:next',
		browser_spellcheck 				: true,
		paste_data_images				: true,
		forced_root_block 				: false,
/*		theme_advanced_buttons1			: "spellchecker,|,bold,italic,underline,strikethrough,|,formatselect,|,justifyleft,justifycenter,justifyright,|,forecolor,backcolor,|,bullist,numlist,|,outdent,indent,|,link,unlink,image,|,removeformat,|,undo,redo,|,copy,cut,paste,pasteword,|,sub,sup,|,charmap,|,tablecontrols,|,media,code,|,fullscreen, print",
		theme_advanced_buttons2			: "undo,redo,|,copy,cut,paste,pasteword,|,sub,sup,|,charmap,|,tablecontrols,|,media,code,|,fullscreen, print",
		theme_advanced_buttons3			: "",
		theme_advanced_toolbar_location : "top",
		theme_advanced_toolbar_align	: "left",
		remove_script_host				: false,
		theme_advanced_styles			: "Header 1=header1;Header 2=header2;Header 3=header3;Table Row=tableRow1",
		onchange_callback				: "markAsDirty",
		table_default_width				: "100%",
		paste_use_dialog				: false,
		paste_auto_cleanup_on_paste		: true,
		paste_convert_headers_to_strong : false,
		paste_strip_class_attributes	: "all",
		paste_remove_spans				: true,
		paste_remove_styles				: true,
		paste_retain_style_properties	: "",
		spellchecker_language			: default_language,
		spellchecker_languages			: languageStr,*/
	//	, file_browser_callback			: "fileBrowserCallBack"
	});
}

function displayClassPicker(target_field_id){
	var class_id	= $("#"+target_field_id).val();
	var role_id		= $("#"+target_field_id).attr('role_id');
	createDiv("class_select_container");
	$("#class_select_container").load("/data/admin_data.php?action=Field::AJAX_BuildClassPicker", {class_id:class_id,role_id:role_id}, function(){
		dlgFetchClassList();
		$("#class_select_container").dialog({modal:true,title:'Select class',position:'top',width:400, buttons:{
			'select':function(){
				var class_id		 = $("#dlg_class_id").val();
				var class_label		 = $("#dlg_class_id option:selected").text();
				var current_year	 = $("#dlg_current_year").val();
				var class_year 		 = $("#dlg_year").val();

				if(current_year!=class_year){
					year_label		 = $("#dlg_year option:selected").text();
					class_label		+= " (" + year_label + ")";
				}

				$("#"+target_field_id).val(class_id).change();
				$("#mock_"+target_field_id).html($("<div>").text(class_label));
				$("#class_select_container").dialog("close");
			},
			'cancel':function(){
				$("#class_select_container").dialog("close");
			}
		}});
	});
}

function dlgFetchClassList(){
	var year = $("#dlg_year").val();
	var school_level_id	= $("#dlg_school_level_id").val();
	$("#dlg_class_id").addClass("ui-autocomplete-loading");
	$.getJSON("/data/admin_data.php?action=Klass::AJAX_GetJSONClassList", {year:year,school_level_id:school_level_id,role_id:'CLASS_VIEW'}, function(class_list){
		$("#dlg_class_id").removeClass("ui-autocomplete-loading");
		populateSelectFromJSONList(class_list, 'dlg_class_id', false);
	})
}

function displayMultiCoursePicker(target_field, role_id){
	var course_list			= new Array();
	var removed_course_list	= new Array();

	wait_message.show();
	$("#"+target_field + "_container .add_class").each(function(i, item){
		course_list.push($(item).val());
	});

	$("#"+target_field + "_container .remove_class").each(function(i, item){
		removed_course_list.push($(item).val());
	});

	createDiv("course_picker_container");
	$("#course_picker_container").load(
		"/data/admin_data.php?action=Field::AJAX_BuildMultiCoursePicker",
		{role_id:role_id, 'course_id[]':course_list,'removed_course_list':removed_course_list,target_field:target_field},
		function(){
			wait_message.hide();
            cs_fetchCourses();
			$("#course_picker_container").dialog({
				modal:true, position:"top", width:680, title:"edit course list",
				buttons:{
					'update':function(){
						var removed_course		= new Array();
						var removed_course_list	= $("#cs_removed_course_list").val();
						removed_course_list		= removed_course_list.split(",");

						$("#"+target_field + "_container").html("");
						$("#cs_selected_course_list option").each(function(i, option){
							course_id			= $(option).val();
							removed_course_list	= removeFromArray(course_id, removed_course_list);

							$("#"+target_field + "_container")
								.append($("<div>").html($(option).html()))
								.append($("<input type='hidden' class='add_class' name='" + target_field + "[]'>").val(course_id));
						});

						$(removed_course_list).each(function(i, course_id){
							if(''!=course_id){
								$("#"+target_field + "_container").append($("<input type='hidden' class='remove_class' name='delete_" + target_field + "[]'>").val(course_id));
							}

						});

						$("#course_picker_container").dialog('close');
					},
					'cancel':function(){
						$("#course_picker_container").dialog('close');
					}
				}
			});
		}
	);
}

function cs_fetchCourses(){
	var school_level_id	= $("#cs_school_level_id").val();
	var year			= $("#course_year_select").val();
	$.getJSON("/data/admin_data.php?action=Course::AJAX_GetCoursesListBySchoolLevelID", {year:year, school_level_id:school_level_id}, function(courses){
		$("#cs_available_course_list").html("");
		$.each(courses, function(i, course){
			$("#cs_available_course_list").append($("<option>").html(course.label).val(course.id));
		});
	});
}

function cs_addCourses(){
	$("#cs_available_course_list option:selected").each(function(i, option){
		var course_id	= $(option).val();
		if($('#cs_selected_course_list option[value="'+course_id+'"]').size()<1){

			var course_list	= $("#cs_removed_course_list").val();
			course_list		= course_list.split(",");
			course_list		= removeFromArray(course_id, course_list);
			$("#cs_removed_course_list").val(course_list.join(","));
			$("#cs_selected_course_list").append($(option).clone());
		}
	});
}

function cs_removeCourses(target_field){
	$("#cs_selected_course_list option:selected").each(function(i, option){
		var course_list	= $("#cs_removed_course_list").val();
		course_list		= course_list.split(",");
		course_list.push($(option).val());
		$("#cs_removed_course_list").val(course_list.join(","));
		$(option).remove();
	});
}

function formatDate(sourceDate) {
	return $.datepicker.formatDate(jquery_date_format, sourceDate);
}

function localDateToJS(local_date){
	return $.datepicker.parseDate(jquery_date_format, local_date);
}

function isValidDate(date_string){
	var is_valid	= true;
	try{
		$.datepicker.parseDate(jquery_date_format, date_string);
		var valid_date = $.datepicker.formatDate(jquery_date_format, new Date());
		if(valid_date.length!=date_string.length&&""!=date_string)is_valid	= false;
	}catch(err){
		is_valid	= false;
	}
	return is_valid;
}

function fetchNextOption(target_id){
	var index	= $("#"+target_id)[0].selectedIndex;
	index++;
	$("#"+target_id+" option").eq(index).attr('selected', 'selected');
	$("#"+target_id).change();
}

function markAnnouncementAsRead(announcement_id){
	var status	= -($("#annoucement_"+announcement_id).attr("alt")-1);
	if(status){
		$('#announcement_switch_'+announcement_id).empty().append("Show");
	}else{
		$('#announcement_switch_'+announcement_id).empty().append("Hide");
	}

	$.post("/data/common_handler.php?action=Announcement::AJAX_U_UpdateReadStatus", {announcement_id:announcement_id,status:status});
	$("#annoucement_"+announcement_id).attr("alt", status);
	$("#annoucement_"+announcement_id).toggle("fast");

}

function createDiv(div_id){
	if(!$("#"+escapeSB(div_id)).size()){
		var html = "<div id='"+div_id+"'></div>";
		$("body").append(html);
	}
}

function resetUI(){
	$("#dlg_day_id").val("");
	$("#dlg_period_id").val("");
}

function buildClassSelect(){
	var year			= $('#dlg_year').val();
	var school_level_id	= $('#dlg_school_level_id').val();

	$("#dlg_user_list").html("");
	$("#dlg_class_id").html("<option></option>");

	$.getJSON("/data/admin_data.php?action=Klass::AJAX_GetJSONClassList", {year:year,school_level_id:school_level_id}, function(class_list){
		populateSelectFromJSONList(class_list, 'dlg_class_id', true);
	})
}

function mouseRowOver(target) {
	$(target).addClass("table_row_over");
}

function mouseRowOut(target) {
	$(target).removeClass("table_row_over");
}

function trim(value) {
	return $.trim(value);
}

function resizeFrames(){
	$("#interface_frame").height(parseInt($(window).height()-$("#interface_frame").offset().top-20));
}

function removeFromArray(needle, stack){
	var	ret = [];
	$(stack).each(function(i,e) {if(needle!=e) ret.push(e);})
	return ret;
}

//Used by graph function
function showTooltip(x, y, exercise_index) {
	contents = exercise_info[exercise_index];
	if(x>550)x=450;
	$('<div id="tooltip">' + contents + '</div>').css( {
		'z-index':2000,position: 'absolute',display: 'none',width:180,top: y + 5,
		left: x + 5,border: '1px solid #fdd',padding: '5px','background-color': '#fee',opacity: 0.90
	}).appendTo("body").fadeIn(200);
}

function initGraph(){
	$.plot(
		$("#graph_container"),
		[
			{label: "Class average",	color:"#000000",	data:class_avg,	points:{show:false, fill:true}, lines:{show:true},hoverable:false},
			{label: "Graded exercises", color:6,			data:student,	points:{show:true, fill:true}, lines:{show:true}, hoverable:true},
			{label: "Not-graded",		color:"#FF0000",	data:student_nc,points:{show:true, fill:true}, lines:{show:false}}
		],
		{
			xaxis:{mode:"time"},
			yaxis:{min:0, max:100},
			grid: {hoverable: true, mouseActiveRadius: 30, autoHighlight:false},
			legend:{container:$("#legend_container")}
		}
	);
	$("#graph_container").bind("plothover", function (event, pos, item) {
		if (item) {
			$("#tooltip").remove();
			if(item.seriesIndex==1){
				highlight = true;
				showTooltip(item.pageX, item.pageY, item.dataIndex);
			}
		}else{
			$("#tooltip").remove();
		}
	});
}

function displayMyStudentSelect(target_field){
	target_field	= escapeSB(target_field);
	var user_id = $("#"+target_field).val();
	var role_id = $("#"+target_field).attr('role_id');
	createDiv("student_select_container");

	$("#student_select_container").load('/data/admin_data.php?action=Field::AJAX_BuildMyStudentSelect',
		{user_id:user_id, role_id:role_id},
		function(){
			buildStudentListByClassID(user_id);
			$("#student_select_container").dialog({
				position:"top",resizable:false,modal:true,title:"Select student",
				buttons:{
					"select": function(){
						$('#mock_'+target_field).val($('#dlg_user_id option:selected').text());
						$('#'+target_field).val($('#dlg_user_id option:selected').val()).change();
						$("#student_select_container").dialog("close");
					},
					"cancel": function(){
						$("#student_select_container").dialog("close");
					}
				},
				close:function(){
					$("#student_select_container").dialog("destroy");
				}
			});
		}
	);
}

function fetchMyStudentList(){
	var selection_type_id	= $('#dlg_selection_type').val();

	$.getJSON('/data/admin_data.php?action=Field::AJAX_FetchMyStudentList', {selection_type_id:selection_type_id}, function(student_list){
		$('#dlg_user_id').html('');
		$(student_list).each(function(i, student){
			$('#dlg_user_id').append($('<option>').val(student.id).text(student.label));
		});
	});
}

function displaySingleStudentSelect(target_field, extended_info, current_year_only){
	var user_id = $("#"+target_field).val();
	var role_id = $("#"+target_field).attr('role_id');
	createDiv("student_select_container");

	$("#student_select_container").load('/data/admin_data.php?action=Field::AJAX_BuildSingleStudentSelect',
		{user_id:user_id, role_id:role_id, extended_info:extended_info, current_year_only:current_year_only},
		function(){
			buildStudentListByClassID(user_id);
            if(user_id == ''){
                buildClassSelect();
            }
			$("#student_select_container").dialog({
				position:"top",resizable:false,modal:true,width:500, title:"Select student",
				buttons:{
					"select": function(){
						setSingleStudent(target_field);
					},
					"cancel": function(){
						$("#student_select_container").dialog("close");
					}
				},
				close:function(){
					$("#student_select_container").dialog("destroy");
				}
			});
		}
	);
}

function setSingleStudent(target_field){
	$("#"+target_field).val($("#dlg_user_list").val());
	$("#"+target_field).trigger("change");
	$("#mock_"+target_field).val($('#dlg_user_list :selected').text());
	$("#student_select_container").dialog("close");
}

function buildStudentListByClassID(student_id){
	var class_id = $("#dlg_class_id").val();
	$.getJSON(
		"/data/admin_data.php?action=Student::AJAX_GetJSONStudentListByClassID", {class_id:class_id},
		function(data){
			$("#dlg_user_list").html("");
			$.each(data, function(i, item){
				$("<option/>").val(item.id).html(item.label).appendTo($("#dlg_user_list"));
			});
			$("#dlg_user_list").val(student_id);
		}
	)
}

function mssUpdateClassList(){
	var year_id = $("#dlg_year").val();
	$("#dlg_class_id").html("");
	$.getJSON(
		"/data/admin_data.php?action=Klass::AJAX_GetJSONClassListByYear", {year_id:year_id},
		function(data){
			var last_option_group = "";
			$("#dlg_class_id").append($("<option/>").val(0).html(""));
			$.each(data, function(i, item){
				if(item.level!=last_option_group) $("#dlg_class_id").append($("<optgroup>").prop("label", item.level));
				$("#dlg_class_id optgroup:last").append($("<option/>").val(item.id).html(item.label));
				last_option_group = item.level;
			});
		}
	)
}

function displayMultiStudentSelect(target_field, target_year, role_id){
	var student_id_list = $("#"+target_field).val();
	target_year			= undefined==target_year ? 0 : target_year;
	createDiv("dlg_container");

	$("#dlg_container").load(
		"/content/dlg_multi_student_select.php",
		{student_id_list:student_id_list, target_field:target_field, year:target_year, role_id:role_id},
		function(){
			buildStudentListByClassID();
			$("#dlg_container").dialog({
				title:"Select student(s)",position:"top", resizable:false, width:820, modal:true,
				buttons:{
					"select": function(){setMultiUser();},
					"cancel": function(){$("#dlg_container").dialog("close");}
				},
				close:function(){$("#dlg_container").dialog("destroy");},
				open:function(){
					var 	timer;
					evalMultiStudentSelectUI();
					$("#dlg_user_list").dblclick(function(){
						addUser();
					});
					$("#dlg_student_search")
						.keyup(function(){
							clearTimeout(timer);
							var ms		= 200; // milliseconds
							var string	= $(this).val();
							var role_id	= $(this).attr('role_id');
							if(string.length>2){
								timer = setTimeout(function() {
									$("#dlg_student_search").addClass("ui-autocomplete-loading");
									$.getJSON(
										"/data/admin_data.php?action=Student::AJAX_GetStudentSearch",
										{search_string:string, role_id:role_id},
										function(data){
											$('#dlg_user_list').html("");
											$.each(data, function(i, item){$('#dlg_user_list').append($("<option>").val(item.id).html(item.label));});
											$("#dlg_student_search").removeClass("ui-autocomplete-loading");
										}
									);
								}, ms);
							}
						});
				}
			});
	});
}

function evalMultiStudentSelectUI(){
	var selection_type_id	=	 $("#dlg_selection_type_id").val();
	$(".student_type_picker").hide();
	switch(selection_type_id){
		case "1": 	$("#dlg_class_level_id").show();		break;	//By class level
		case "2": 	$("#dlg_class_id").show();				break;	//By class
		case "3": 	$("#course_select_container").show();	break;	//By course
		case "4": 	$("#dlg_student_search").show();		break;	//By name search
		case "5": 	$("#dlg_house_id").show();				break;	//By house
	}
	$("#dlg_user_list").html("");
}

function buildMSStudentList(){
	var selection_type_id	=	$("#dlg_selection_type_id").val();
	var year 				=	$("#dlg_year").val();
	switch(selection_type_id){
		case "1": 	var url = '/data/admin_data.php?action=Student::AJAX_GetJSONStudentListByClassLevelID'; var param 	= {class_level_id:$("#dlg_class_level_id").val(), year:year};	break;
		case "2": 	var url = '/data/admin_data.php?action=Student::AJAX_GetJSONStudentListByClassID'; var param 	= {class_id:$("#dlg_class_id").val()};								break;
		case "3": 	var url = '/data/admin_data.php?action=Student::AJAX_GetJSONStudentListByCourseID'; var param 	= {course_id:$("#dlg_course_id").val()};							break;
		case "5": 	var url = '/data/admin_data.php?action=Student::AJAX_GetJSONStudentListByBoardingHouseID'; var param 	= {house_id:$("#dlg_house_id").val()};							break;
	}

	if("4"!=selection_type_id){
		$.getJSON(url, param,
			function(json_student_list){
				populateSelectFromJSONList(json_student_list, "dlg_user_list", false);
			}
		);
	}
}

function addUser(){
	var source = document.getElementById("dlg_user_list");
	var target = document.getElementById("dlg_selected_user_list");
	for(var i = 0;i < source.options.length; i++){
		if(source.options[i].selected){
			if(!entryExistsInSelect("dlg_selected_user_list", source.options[i].value)){
				var user_id		= source.options[i].value;
				$("#dlg_container .delete_user_id_"+user_id).remove();
				target.options[target.options.length] = new Option(source.options[i].text, user_id);
			}
		}
	}
}

function removeUser(){
	var source = document.getElementById("dlg_user_list");
	var target = document.getElementById("dlg_selected_user_list");
	for(var i = 0;i < target.options.length; i++){
		if(target.options[i].selected){
			if(entryExistsInSelect("dlg_selected_user_list", target.options[i].value)){
				$(target.options[i]).addClass("remove_opt");
			}
		}
	}
	$('.remove_opt').remove();
}

function addAllUser(){
	var source = document.getElementById("dlg_user_list");
	var target = document.getElementById("dlg_selected_user_list");
	for(var i = 0;i < source.options.length; i++){
		if(!entryExistsInSelect("dlg_selected_user_list", source.options[i].value)){
			var user_id		= source.options[i].value;
			$("#dlg_container .delete_user_id_"+user_id).remove();
			target.options[target.options.length] = new Option(source.options[i].text, user_id);
		}
	}
}

function entryExistsInSelect(select_id, value){
	var target	= document.getElementById(select_id);
	var ret		= false;
	for(var i = 0;i < target.options.length; i++){
		if(target.options[i].value==value) ret = true;
	}
	return ret;
}


function setMultiUser(){
	var target_field_id		= $("#dlg_target_field").val();
	var student_id_array	= new Array();
	var student_name_array	= new Array();

	$("#dlg_selected_user_list option").each(function(){
		var user_id			= this.value;
		$(".delete_user_id_"+user_id).remove();
		student_id_array.push(user_id);
		student_name_array.push(this.text);
	});

	$("#dlg_container .delete_user_field").appendTo("form");
	$("#"+target_field_id).val(student_id_array.join(","));
	$("#"+target_field_id).attr({title:student_id_array.length});
	$("#"+target_field_id).change();

	$("#mock_field_"+target_field_id).html("");
	$(student_name_array).each(function(i, entry){
		$("#mock_field_"+target_field_id).append($('<div>').text(entry));
	});

	$("#dlg_container").dialog("close");
}


function displayAttendance(student_id, attendance_id){
	createDiv("misdemeanour_container");
	$("#misdemeanour_container").load(
		"/data/common_handler.php?action=Attendance::AJAX_U_BuildAttendanceDetailTable", {student_id:student_id, attendance_id:attendance_id},
		function(){
			$("#misdemeanour_container").dialog({
				position:"top",title:" Attendance details", resizable:false, width:400, autoOpen:false, modal:true,
				buttons:{"close": function(){closeMidemeanourDialog();}}
			});
			$("#misdemeanour_container").dialog("open");
		}
	);
}

function displayNewAttendance(student_id, attendance_id){
	createDiv("misdemeanour_container");
	$("#misdemeanour_container").load(
		"/data/common_handler.php?action=User_Attendance::AJAX_U_BuildAttendanceDetailTable", {student_id:student_id, attendance_id:attendance_id},
		function(){
			$("#misdemeanour_container").dialog({
				position:"top",title:" Attendance details", resizable:false, width:400, autoOpen:false, modal:true,
				buttons:{"close": function(){closeMidemeanourDialog();}}
			});
			$("#misdemeanour_container").dialog("open");
		}
	);
}

function displayDiscipline(discipline_id){
	createDiv("misdemeanour_container");
	$("#misdemeanour_container").load(
		"/data/common_handler.php?action=Discipline::AJAX_U_BuildDisciplineDetailTable", {discipline_id:discipline_id},
		function(){
			$("#misdemeanour_container").dialog({
				position:"top",title:" Discipline details", resizable:false, width:500,autoOpen:false, modal:true,
				buttons:{"close": function(){closeMidemeanourDialog();}}
			});
			$("#misdemeanour_container").dialog("open");
		}
	);
}

function closeMidemeanourDialog(){
	$("#misdemeanour_container").dialog("close");
	$("#misdemeanour_container").html("");
}

function getCookie(c_name){
	if (document.cookie.length>0){
		var c_start=document.cookie.indexOf(c_name + "=");
		if (c_start!=-1){
			c_start	= c_start + c_name.length+1;
			var c_end	= document.cookie.indexOf(";",c_start);
			if (c_end==-1) c_end=document.cookie.length;
			return unescape(document.cookie.substring(c_start,c_end));
		}
	}
	return "";
}

function loadUser(userID) {
	wait_message.show();
	openContent("/content/user/user_profile.php?user_id="+userID);
}

function loadStudentAPEntries(student_id){
	$('<form id="load_student_ap_form" action="/content/ap_entries/ap_entry_edit.php" method="POST"><input type="hidden" id="ap_entry_student_id" name="ap_entry_student_id" value=""/></form>')
	.appendTo('body');
	$("#ap_entry_student_id").val(student_id);
	$("#load_student_ap_form").submit();
}

function loadStaffAPEntries(ap_entry_user_id){
	$('<form id="load_student_ap_form" action="/content/ap_entries/ap_entry_edit_by_staff.php" method="POST"><input type="hidden" id="ap_entry_user_id" name="ap_entry_user_id" value=""/></form>')
	.appendTo('body');
	$("#ap_entry_user_id").val(ap_entry_user_id);
	$("#load_student_ap_form").submit();
}

function loadStudentAPEntriesForStudents(){
	wait_message.show();
	openContent("/content/ap_entries/ap_entry_read.php");
}

function initAJAXWaitMsg(){
	$("body")
		.bind("ajaxStart",function(){
			if ($(this).parent('#interface_content').length > 0) {
				wait_message.show();
			}
		})
		.bind("ajaxComplete",function(){wait_message.hide();});
}

function pleaseWait(){
	var msg = new waitMessage();
	msg.show();
}

function waitMessage(){
	initWaitMessage();
	$("#ajaxBusy").dialog({title:"Processing", resizable:false,height:200,position:"top",autoOpen:false,modal:true});
	this.hide = hide;
	this.show = show;

	function show(){$("#ajaxBusy").dialog("open").show();}
	function hide(){
		$("#ajaxBusy").dialog("close").hide();
//    	$('.ui-widget-overlay').css('display', 'none').css('z-index','-1');
	}
}

function initWaitMessage(){
	if(!$("#ajaxBusy").size()){
		$("body").append("<div id='ajaxBusy' style='display:none;'><p class='center' style='padding:10px;'><img src='/resources/loading.gif'><br /><br />Processing your request; please wait.</p></div>");
	}
}

function wait(msecs){
	var start = new Date().getTime();
	var cur = start
	while(cur - start < msecs)
	{
		cur = new Date().getTime();
	}
}

function isEmailUsed(user_id, email){
	var existing_name = $.ajax({url:"/data/common_handler.php?action=Contact::AJAX_U_ValidateEmail", async:false, data:{user_id:user_id,email:email}}).responseText;
	return existing_name;
}

function isEmailFormatValid(email){
	var is_valid = $.ajax({url:"/data/common_handler.php?action=Contact::AJAX_U_ValidateEmailFormat", async:false, data:{email:email}}).responseText;
	return is_valid;
}

function countSelected(selectID){
	var count = 0;
	var targetField = document.getElementById(selectID);
	for(var x = 0; x<targetField.options.length;x++){
		if(targetField.options[x].selected) count++;
	}
	return count;
}

function setCookie(c_name, value, expiredays) {
	var exdate	= new Date();
	exdate.setDate(exdate.getDate()+expiredays);
	document.cookie	= c_name+ "=" +escape(value) + ((expiredays==null) ? "" : ";expires="+exdate.toGMTString()) + ";path=/";
}

function inBetween(sentence, start, end){
	var ret = null;
	if(-1!=sentence.indexOf(start)&&-1!=sentence.indexOf(end)){
		var word_length	= sentence.indexOf(end) - sentence.indexOf(start)-start.length;
		ret	= sentence.substr(sentence.indexOf(start)+start.length, word_length);
	}
	return ret;
}

function getValueFromCheckbox(fieldName){
	var ret			= new Array();
	var ret_counter	= 0;
	var targetField	= document.getElementsByName(fieldName+"[]");
	for(var x = 0; x<targetField.length;x++){
		if(targetField[x].checked){
			ret[ret_counter] = targetField[x].value;
			ret_counter++;
		}
	}
	return ret;
}

function getValueFromRadio(radioName){
	var ret = "";
	var targetField= document.getElementsByName(radioName);
	for(var x = 0; x<targetField.length;x++){
			if(targetField[x].checked) ret = targetField[x].value;
	}
	return ret;
}

function getLabelFromRadio(radioName){
	var ret = "";
	var targetField= document.getElementsByName(radioName);
	for(var x = 0; x<targetField.length;x++){
			if(targetField[x].checked) ret = targetField[x].alt;
	}
	return ret;
}

function getLabelFromSelect(selectionID) {
	var	ret = "";
	selectionID	= escapeSB(selectionID);

	if(0!=$("#" + selectionID + " option").size()){
		var optionIndex = $("#" + selectionID).prop("selectedIndex");
		ret = $("#"+selectionID + " option").eq(optionIndex).text();
	}
	return ret;
}

function escapeSB(sString){
	return sString.replace(/\[/g, '\\[').replace(/\]/g, '\\]');
}

function getValueFromSelect(selectionID) {
	var selectedIndex = document.getElementById(selectionID).selectedIndex;
	return document.getElementById(selectionID).options[selectedIndex].value;
}

function openContent(targetURL, do_not_confirm) {
	var ask			= false;
	var proceed		= true;
	do_not_confirm	= do_not_confirm==undefined ? false : do_not_confirm;
	targetURL		= location.protocol + '//' + location.host + targetURL;

	try{
		if(window.is_dirty	!= undefined){
			if(window.is_dirty) ask = true;
		}
	}catch(e){

	}

	if(ask&&!do_not_confirm){
		if(!confirm("You've made changes to the current document but did not save them.\n\nClick 'OK' to exit and lose changes.\nClick 'Cancel' to stay on current page.")){
			proceed = false;
			wait_message.hide();
		}
	}

	if(proceed){
		window.location.href = targetURL;
	}
}

function setAllCheckBoxes(FormName, FieldName, CheckValue) {
	if(!document.forms[FormName])
		return;
	var objCheckBoxes = document.forms[FormName].elements[FieldName];
	if(!objCheckBoxes)
		return;
	var countCheckBoxes = objCheckBoxes.length;
	if(!countCheckBoxes)
		objCheckBoxes.checked = CheckValue;
	else
		for(var i = 0; i < countCheckBoxes; i++){
			objCheckBoxes[i].checked = CheckValue;
		}
}

function isValidEmail(emailAddress) {
	var pattern = new RegExp(/^['A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,6}$/i);
	return pattern.test(emailAddress);
}

function isInteger(s){
	var i;
	for (i = 0; i < s.length; i++){
		// Check that current character is number.
		var c = s.charAt(i);
		if (((c < "0") || (c > "9"))) return false;
	}
	return true;
}

function stripCharsInBag(s, bag){
	var i;
	var returnString = "";
	// Search through string's characters one by one.
	// If character is not in bag, append to returnString.
	for (i = 0; i < s.length; i++){
		var c = s.charAt(i);
		if (bag.indexOf(c) == -1) returnString += c;
	}
	return returnString;
}


function loadStudentFromSelect(targetSelect) {
	studentid = getValueFromSelect(targetSelect.id);
	loadStudent(studentid);
}

function loadCourse(course_id){
	openContent("/content/course/course_read.php?course_id="+course_id);
}

function loadCourse_20(course_id) {
    wait_message.show();
    openContent("/courses/view/"+course_id);
}

function loadNewCourse(course_id){
	openContent("/courses/view/"+course_id);
}

function editCourse(course_id){
	wait_message.show();
	openContent("/content/course/course_edit.php?course_id="+course_id);
}

function loadExercise(exercise_id){
	openContent(MSM_EXERCISE_EDIT_URL+"?exercise_id="+exercise_id);
}

function loadOldExercise(exercise_id){
	openContent("/content/exercise/exercise_edit.php?exercise_id="+exercise_id);
}

function displayEmailLog(){
	var user_id = $('#user_id').val();
	createDiv('message_log');
	wait_message.show();
	$('#message_log').load(
		'/data/admin_data.php?action=Contact::AJAX_GetMessageLogs',
		{user_id:user_id},
		function(){
			wait_message.hide();
			$('#message_log').slideOver({
				title:'Communication logs',
				buttons:{
					'print selected':function(){
						var selection = $('.message_selector:checked');
						if(0==selection.length){
							alert('You must select at least one entry');
						} else {
							var message_uuids = [];
							$(selection).each(function(i, entry){
								message_uuids.push('message_uuid[]='+$(entry).val());
							});
							openContentExternally('/data/admin_data.php?action=Contact::AJAX_PrintMessages&' + message_uuids.join('&'))
						}
					},
					'close':function(){
						$('#message_log').slideOver('close');
					}
				}
			});
		}
	);
}

function loadTeacherExercise(exercise_id){
	createDiv('assignment_container');

	var args = {
		exercise_id: exercise_id
	};

	var $assignmentContainer = $('#assignment_container');
	$assignmentContainer.load(
		'/data/common_handler.php?action=Exercise::AJAX_U_GetExercise',
		args,
		function(){
			var buttons = {};
			buttons.close = function(){
				$assignmentContainer.dialog('close');
			};

			var dialogWidth = 600;
			if(window.innerWidth < 600){
				dialogWidth = window.innerWidth;
			}

			$assignmentContainer.dialog(
				{
					modal:true,position:'top',width:dialogWidth,title:'Exercise details',
					buttons:buttons
				}
			);
		}
	);
}

function loadStudentExercise(exercise_id, user_id){
	createDiv('assignment_container');

	var args = {
		exercise_id: exercise_id,
		user_id: user_id
	};

	var $row = $('#sedb_' + exercise_id + '_' + user_id);

	var $assignmentContainer = $('#assignment_container');
	$assignmentContainer.load(
		'/data/common_handler.php?action=AssignedExercise::AJAX_U_GetStudentExercise',
		args,
		function(){
			var isStudent = $assignmentContainer.find('.is-student').length !== 0,
				buttons = {},
				currentParentState = $assignmentContainer.find(':input[name=parent_state]').val(),
				currentStudentState = $assignmentContainer.find(':input[name=student_state]').val()
			;

			if ($row.hasClass('read') === false) {
				$row
					.find('.state-icon')
					.toggleClass('ui-icon-check', false)
					.toggleClass('ui-icon-mail-open', true)
					.toggleClass('ui-icon-mail-closed', false)
				;
			}

			$row.addClass('read');

			var stateTransitionCallback = function(data) {
				$row.find('.state-icon')
					.toggleClass('ui-icon-check', data === 'done')
					.toggleClass('ui-icon-mail-open', data === 'read')
					.toggleClass('ui-icon-mail-closed', data === 'unread')
				;

				$row.toggleClass('read', data !== 'unread');

				$assignmentContainer.dialog('close');
			};

			if (isStudent === false) {
				if (currentParentState == 'done') {
					buttons['mark not done'] = function () {
						$.post('/data/common_handler.php?action=AssignedExercise::AJAX_U_MarkParentStudentExerciseUndone', args, stateTransitionCallback);
					};
				} else if (currentParentState == 'read') {
					buttons['mark as done'] = function () {
						$.post('/data/common_handler.php?action=AssignedExercise::AJAX_U_MarkParentStudentExerciseDone', args, stateTransitionCallback);
					};

					buttons['mark as unread'] = function () {
						$.post('/data/common_handler.php?action=AssignedExercise::AJAX_U_MarkParentStudentExerciseUnread', args, stateTransitionCallback);
					};
				}
			}else{
                if (currentStudentState == 'done') {
                    buttons['mark not done'] = function () {
                        $.post('/data/common_handler.php?action=AssignedExercise::AJAX_U_MarkStudentStudentExerciseUndone', args, stateTransitionCallback);
                    };
                } else if (currentStudentState == 'read') {

                    buttons['mark as done'] = function () {
                        $.post('/data/common_handler.php?action=AssignedExercise::AJAX_U_MarkStudentStudentExerciseDone', args, stateTransitionCallback);
                    };

                    buttons['mark as unread'] = function () {
                        $.post('/data/common_handler.php?action=AssignedExercise::AJAX_U_MarkStudentStudentExerciseUnread', args, stateTransitionCallback);
                    };
                }
			}

			buttons.close = function(){
				$assignmentContainer.dialog('close');
			};

			var dialogWidth = 600;
			if(window.innerWidth < 600){
				dialogWidth = window.innerWidth;
			}

			$assignmentContainer.dialog(
				{
					modal:true,position:'top',width:dialogWidth,title:'Exercise details',
					buttons:buttons
				}
			);
		}
	);
}

function loadRoom(room_id) {
	openContent("/content/room/room_read.php?room_id="+room_id);
}

function loadStudent(user_id, context_type, context_id, tab) {
	wait_message.show();
	var url		 = "/content/student/student_profile.php?user_id="+user_id;
	if((typeof context_type != 'undefined' && context_type != false ) && (typeof context_id != 'undefined' && context_id != false)){
		url		+= "&context_type="+context_type+"&context_id="+context_id;
	}
    if(typeof tab != 'undefined'){
        url		+= "&tab="+tab;
    }
	openContent(url);
}

function loadUserExternally(user_id){
	openContentExternally("/content/user/user_profile.php?user_id="+user_id);
}

function loadStudentExternally(user_id){
	openContentExternally("/content/student/student_profile.php?user_id="+user_id);
}

function openContentExternally(url){
	window.open(url, "_blank");
}

function loadStudentForTeacher(user_id) {
	openContent("/content/student/student_profile_for_teacher.php?user_id="+user_id);
}

function loadStudentForNurse(user_id) {
	openContent("/content/student/student_profile_for_nurse.php?user_id="+user_id);
}

function loadSubject(subject_id) {
	openContent("/subjects/view/"+subject_id);
}

function loadInvoice(invoice_id) {
	openContent("/content/journal_entry/invoice_read.php?invoice_id="+invoice_id);
}

function loadJournalEntry(entry_id) {
	openContent("/content/journal_entry/journal_entry_read.php?journal_entry_id="+entry_id);
}

function loadClass(class_id) {
	wait_message.show();
	openContent("/content/class/class_read.php?class_id="+class_id);
}

function loadClass_20(class_id) {
	wait_message.show();
	openContent("/classes/view/"+class_id);
}

function loadDiscipline(discipline_id) {
	openContent("/content/discipline/discipline.php?discipline_id="+discipline_id);
}

function loadApplication(application_id){
	openContent("/content/application/application_edit.php?application_id="+application_id);
}

function loadAttendanceSheet(local_date, course_id, period_id) {
	openContent("/content/attendance/attendance_edit.php?date="+local_date+"&course_id="+course_id+"&period_id="+period_id);
}

function loadAttendance(attendanceID, studentID) {
	openContent("/content/attendance/attendance_detail.php?attendanceid="+attendanceID+"&studentid="+studentID);
}

function newLoadAttendance(attendanceID) {
	openContent("/content/attendance/new_attendance_detail.php?attendanceid="+attendanceID);
}

function downloadGuardianJournalEntry(journal_entry_id){
	openContent("/data/common_handler.php?action=JournalEntryPDF::AJAX_U_Download&journal_entry_id="+journal_entry_id);
}

function downloadGuardianInvoice(invoice_id){
	openContent("/data/common_handler.php?action=InvoicePDF::AJAX_U_Download&invoice_id="+invoice_id);
}

function loadGuardianInvoice(invoice_id) {
	openContent("/content/guardian/money_invoice.php?invoice_id="+invoice_id);
}

function loadGuardianJournalEntry(entry_id) {
	openContent("/content/guardian/money_journal_entry.php?journal_entry_id="+entry_id);
}

function checkAllCheckbox(){
	$("input[type=checkbox]").attr("checked",!tog);
	tog = !tog;
}

function getNationalitySelectUI(nationality_field_name){
	createDiv("nationality_select");
	var nationality_list	= [];
	$("#mock_" + escapeSB(nationality_field_name) + ' .nationality_field').each(function(i, field){
		nationality_list.push($(field).val());
	});

	$("#nationality_select").load("/data/anonymous_handler.php",{action:'Field::AJAX_A_BuildNationalityPicker', nationality_list:nationality_list}, function(){
		$("#nationality_select").dialog({
			width:650, position:"top", resizable:false, modal:true,  title:"Select nationality",
			open:function(){
				$('#all_nationality_list').dblclick(
					function(){addNationality();}
				);
			},
			buttons:{
				"select": function(){
					updateNationality(nationality_field_name);
					$("#mock_" + escapeSB(nationality_field_name)).trigger("change");
				},
				"cancel": function(){
					$("#nationality_select").dialog("close");
				}
			}
		});
	});
}

function fetchAbsenceListTable(source, user_id, local_date){
	$(source).qtip({
		content:{text: 'Loading...', ajax: {url: '/data/admin_data.php?action=User_Attendance::AJAX_fetchAbsenceListTable&user_id='+user_id+'&local_date='+local_date, type: 'GET'}},
		position:{target: 'event', viewport: $(window), my: 'top right', at:'bottom right'},
		style:{tip:true, classes:'ui-tooltip-light'},
		show: {event: 'click', solo: true, effect: false, ready: true},	hide:'unfocus'
	});
	$(source).unbind('mouseenter mouseleave mouseover mouseout');
	return false;
}

function addNationality(){
	var source_options	= $("#all_nationality_list option:selected");

	source_options.each(function(i, option){
		$("#selected_nationalities").append(option);
	});
}

function removeNationality(){
	var source = document.getElementById("selected_nationalities");
	for(var i = 0; i < source.options.length; i++){
		if(source.options[i].selected) {
			source.remove(i);
			i = i-1;
		}
	}
}

function updateNationality(nationality_field_name){
	var container_id			= escapeSB('#mock_' + nationality_field_name);

	$(container_id).html('');
	$('#selected_nationalities option').each(function(i, option){
		$(container_id)
			.append($('<input class="nationality_field" type="hidden">').attr('name', nationality_field_name + '[]').val($(option).val()))
			.append('<div>' + $(option).text() + '</div>');
	});

	$("#nationality_select").dialog("close");
}

function loadPaymentHistory(user_id){
	openContent("/content/journal_entry/guardian_balance_history.php?user_id="+user_id);
}

function loadDonation(donation_id){
	openContent("/content/donation/donation_read.php?donation_id="+donation_id);
}

function loadCampaign(campaign_id){
	openContent("/content/campaign/campaign_edit.php?campaign_id="+campaign_id);
}

function addPhone(){
	$("#source_table tr:last").clone().appendTo("#phone_table");
}

function removePhone(target, phone_id){
	$(target).parent().parent().remove();
	if(phone_id) $("#deleted_phones").val($("#deleted_phones").val()+","+phone_id);
	return false;
}

function sendLoginInstructions(user_id_field, email_field, status_field, name_field, surname_field, secondary_email_field){
	var valError			= "";
	var user_id				= $("#"+user_id_field).val();
	var user_email			= $("#"+email_field).val();
	var user_status			= $("#"+status_field).val();

	var user_name			= $("#"+name_field).val();
	var user_surname		= $("#"+surname_field).val();

	var secondary_email		= "";
	if(secondary_email_field){
		secondary_email = $("#"+secondary_email_field).val();
	}

	if(user_id==0)		valError += " - The user must be saved first\n";
	if(1!=user_status)	valError += " - The user status must be active\n";

	if(user_email || secondary_email){
		if (!isValidEmail(user_email)){
			valError += " - The email format is invalid\n";
		}else{
			var conflicting_user = isEmailUsed(user_id, user_email);
			if(conflicting_user){
				valError += " - The email address is already used by "+conflicting_user+"\n";
			}
		}
		if (secondary_email && !isValidEmail(secondary_email)){
			valError += " - The secondary email format is invalid\n";
		}
	}else{
		valError += " - An email address must be provided\n";
	}

	if(valError){
		alert("The following validation error(s) have been encountered:\n\n" + valError + "\nCorrect the listed error(s) to continue.");
	}else if(confirm("Are you sure you want to email the login instructions and password to the user selected?")){
		$.post("/data/admin_data.php?action=User::AJAX_SendLoginDetails", {user_id:user_id, email:user_email,user_name:user_name,user_surname:user_surname, secondary_email: secondary_email});
	}
}

function isValideExtension(fileName, fileTypes){
	var ret = false;
	if(""!=fileName&&'undefined'==fileName){
		var name_parts	= fileName.split(".");
		var npl			= name_parts.length;
		if(npl>1){
			var extension = name_parts[npl-1];
			for(i in fileTypes){
				if(fileTypes[i]==extension.toLowerCase()) ret = true;
			}
		}
	}else{
		ret = true;
	}
	return ret;
}

function openPrintStudentSettings(user_id){
	var user_id				= $("#user_id").val();
	var year_id 			= $('#course_year').val();
	var month_start 		= $("#selected_month_start").val();
	var month_attendance 	= $("#selected_month_attendance").val();
	createDiv("print_settings_container");
	$("#print_settings_container")
		.load("/data/admin_data.php?action=Student::AJAX_BuildPrintStudentSettingsForm", {user_id:user_id}, function(){
			$("#print_settings_container").dialog({title:"Select tabs to print", modal:true, position:"top", width:300,resizable:false,
				close:function(){$("#print_settings_container").dialog("destroy")},
				buttons:{
					"Print":function(){
						var tabstoprint = Array();
						$("input[name='tab_print_list[]']:checked").each(function(index){
							tabstoprint.push($(this).val());
						});
						if(0==tabstoprint.length){
							alert("You must select at least one tab");
						}else{
							tabstoprint = tabstoprint.join(',');
							window.open("/content/student/student_profile.php?user_id="  + user_id + "&course_year=" + year_id + "&tabstoprint=" + tabstoprint + "&month_start=" + month_start + "&selected_month_attendance=" + month_attendance);
						}
					},
					"cancel":function(){
						$("#print_settings_container").dialog("close");
					}
				}
			});
		})
}

function printStudent(){
	$(".ui-tabs-panel").removeClass("no_print");
	window.print();
}

function returnToEntryPoint(){
	var entry_point	= getCookie("return_to_url");
	entry_point		= ""==entry_point ? "/content/common/dashboard.php" : entry_point;
	openContent(entry_point);
}

function evalGroupSelectUI(){
	scroll_to_heigh		= $(".mgs_container").filter(":visible").scrollTop();
	var audience_id		= getValueFromRadio("user_type_id");
	var audience_prefix	= "";
	$(".audience-container").hide();
	$("#audience-select-container").hide();
	$("#msg-unit-select-container").hide();
	$("#group-select-container").hide();

	if("4"==audience_id){
		$("#group-select-container").show();
	}else{
		$("#audience-select-container").show();
		$("#msg-unit-select-container").show();

		switch(audience_id){
			case "1":audience_prefix="parent";break;
			case "2":audience_prefix="student";break;
			case "3":audience_prefix="staff";break;
		}
	}

	$(".mgs_container").hide();
	$("#"+audience_prefix+"-select-container").show();

	switch(getValueFromRadio("unit-select")){
		case "1":$("#"+audience_prefix+"-school-select-container").show();break;
		case "2":$("#"+audience_prefix+"-class-select-container").show();break;
		case "3":$("#"+audience_prefix+"-course-select-container").show();break;
		case "4":$("#"+audience_prefix+"-indivi-select-container").show();break;
	}

	$("#mgs_group_bucket").html("");
	$(".mgs_container input:checked").each(function(i, object){
		$("#mgs_group_bucket").append(buildBucketItem(i, object));
	});

	$(".mgs_group_container input:checked").each(function(i, object){
		$("#mgs_group_bucket").append(buildBucketItem(i, object));
	});

	$(".mgs_container").filter(":visible").scrollTop(scroll_to_heigh)
	return false;
}

function buildBucketItem(i, object){
	var class_label		= "";
	var group_type		= "";
	var label_prefix	= "";
	var remove_button	= "";
	var info_button		= "";
	var item_id			= "ID" + Math.floor( Math.random()*99999 );
	var label			= $(object).attr("alt");
	var source_id		= $(object).attr("id");
	var name			= $(object).attr("name");
	var val				= $(object).val();

	if($(object).hasClass("parent")){
		label_prefix	= 'Parents of ';
		group_type		= 'parent';
	}
	if($(object).hasClass("student")){
		label_prefix	= 'Students of ';
		group_type		= 'student';
	}

	if($(object).hasClass("staff")){
		label_prefix	= 'Staff of ';
		group_type		= 'staff';
	}

	if($(object).hasClass("staff_group")){
		group_type		= 'staff';
	}

	if($(object).hasClass("group")){
		group_type		= 'group';
	}

	if($(object).hasClass("indivi")){
		label_prefix	= '';
		class_label		= 'msg_indivi_li';
	}else{
		class_label		= 'msg_group_li';
		info_button		= $("<span class='ui-blue-icon ui-icon-pencil pointer' alt='view list' style='float:right;'></span>").click(function(){displayGroupMembers(name, val, item_id, source_id)});
	}

	remove_button		= $("<span class='ui-red-icon ui-icon-close pointer' style='float:right;'></span>").click(function(){removeGroupItem(item_id, source_id)});

	var full_label		= "<span style='float:left;'>"+ shrinker(label_prefix+label, 34)+"</span>";
	return	$("<li>")
				.addClass(group_type)
				.addClass(class_label)
				.prop("id", item_id)
				.append(full_label)
				.append(remove_button)
				.append(info_button)
				.append($("<input type='hidden' class='name_group'>").prop("name", name).val(val).addClass(group_type));
}

function displayGroupMembers(field_name, id, item_id, source_id){
/*******************************************************************************
 *	Display members of a group (e.g. 'Parents of class X')
 *	Clicking the update button will flatten the group:
 *		Instead of having 1 whole group, the UI will display the group members
 ******************************************************************************/
	createDiv("group_member_list_diag");
	var displayMainContactOnly		= $("#main-contact-only").prop("checked");
	var display_invoice_payers_only	= $("#display-invoice-payers-only").val();
	$("#group_member_list_diag").html("").css("overflow-y", "auto").css("height", "200px");

	$.getJSON("/data/admin_data.php?action=Contact::AJAX_GetJSONGroupList",{group_type:field_name, group_id:id, display_main_contact_only:displayMainContactOnly, display_invoice_payers_only:display_invoice_payers_only}, function(data){
		$(data).each(function(i, item){
			$("#group_member_list_diag").append(
				$("<div>")
					.css("margin", "3px").css("padding", "3px")
					.append($("<input name='individual-select[]' type='checkbox' class='small_input indivi' checked>").val(item.user_id).prop("id", "individual_"+item.user_id).prop("alt", item.user_name).addClass(item.class_name))
					.append($("<label>").html(item.user_name).prop("for", "individual_"+item.user_id))
			)

		});

		$("#group_member_list_diag").dialog({
			title:"Group members",height:300, modal:true,position:"top",
			buttons:{
				"update":function(){
					$("#group_member_list_diag input:checked").each(function(i, item){
						$("#mgs_group_bucket").append(buildBucketItem(i, item));
						$(".individual_container:first").append($("<div class='mgs_search_result_item'>").append(item).append($("<label>").html($(item).prop("alt")).prop("for", $(item).prop("id"))));
					});
					removeGroupItem(item_id, source_id);
					$("#group_member_list_diag").dialog("close")
				},
				"close":function(){$("#group_member_list_diag").dialog("close")}
			},
			close:function(){$("#group_member_list_diag").dialog("destroy")}
		});
	});
}

function removeGroupItem(target, source){
	$("#"+target).remove()
	$("#"+source).attr('checked', false);
}

function setPermission(permission_id, user_id, permission_status_id){
	//Don't bother. It's not what you think
	var permission_status_label	= 1==permission_status_id ? "approve" : "decline";
	if(confirm("Are you sure you want to " + permission_status_label + " this permission slip?")){
		$.get("/data/common_handler.php?action=PermissionSlip::AJAX_U_SetPermissionStatus", {permission_id:permission_id, user_id:user_id, permission_status_id:permission_status_id}, function(){
			$("#cell-"+permission_id+"-"+user_id+"-1").hide();
			$("#cell-"+permission_id+"-"+user_id+"-2").hide();
            $("#cell-"+permission_id+"-"+user_id+"-3").html(permission_status_label.charAt(0).toUpperCase() + permission_status_label.slice(1)+"d");
            $("#cell-"+permission_id+"-"+user_id+"-3").show();
            $("#cell-"+permission_id+"-"+user_id+"-4").show();
			alert("Permission set.");
		});
	}
}

function resetPermission(permission_id, user_id, permission_status_id){
    if(confirm("Are you sure you want to edit this permission slip?")){
        $.get("/data/common_handler.php?action=PermissionSlip::AJAX_U_SetPermissionStatus", {permission_id:permission_id, user_id:user_id, permission_status_id:permission_status_id}, function(){
            $("#cell-"+permission_id+"-"+user_id+"-1").show();
            $("#cell-"+permission_id+"-"+user_id+"-2").show();
            $("#cell-"+permission_id+"-"+user_id+"-3").hide();
            $("#cell-"+permission_id+"-"+user_id+"-4").hide();
        });
    }
}

var scsFullCourseList;

function scsDisplaySingleCourseSelect(field_name, only_reportable_course, jquery_date_select, override_access_limitations, add_block_to_label){
	createDiv("single_course_select_container");
	field_name		= escapeSB(field_name);
	var course_id	= $("#" + field_name).val();
	var role_id		= $("#" + field_name).attr('role_id');
	var year 		= $(jquery_date_select).val();
    var dialogWidth = 500;
    if(window.innerWidth < 500){
        dialogWidth = window.innerWidth;
    }
	$("#single_course_select_container").load(
		"/data/admin_data.php?action=Field::AJAX_BuildCoursePicker",
		{
			role_id: 						role_id,
			course_id: 						course_id,
			only_reportable_course: 		only_reportable_course,
			year: 							year,
			override_access_limitations: 	override_access_limitations,
			field_name: 					field_name,
            add_block_to_label: 			add_block_to_label
		},
		function(){
			$("#single_course_select_container").dialog({
				modal:true, position:"top",title:"Select a course", width:dialogWidth,
				buttons:{
					"select":function(){
						scsConfirmSelection(field_name);
					},
					"cancel":function(){
						$("#single_course_select_container").dialog("close");
					}
				}
			});
		}
	)
}

function scsConfirmSelection(field_name){
	$("#" + field_name).val($("#scs_course_id").val()).change();
	var course_label	= getLabelFromSelect("scs_course_id");
	$("#mock-"+field_name).val(course_label);
	$("#single_course_select_container").dialog("close");
}

function scsFilterCourseList(){
	var	filter	= $("#scs_course_filter").val();
	if(''==filter){
		populateSelectFromJSONList(scsFullCourseList, 'scs_course_id', false);
	}else{
		filter			= filter.toUpperCase();
		populateSelectFromJSONList(scsFullCourseList, 'scs_course_id', false);
		$("#scs_course_id option").each(function(i, option){
			var label	= $(option).text().toUpperCase();
			if(-1==label.indexOf(filter)){
				$(option).remove();
			}
		});
	}
}

function scsFetchCourseList(add_block_to_label){
	var scs_year			= $("#scs_year").val();
	var scs_school_level_id	= $("#scs_school_level_id").val();
	$("#scs_course_id").html("");
	$.getJSON("/data/admin_data.php?action=Course::AJAX_GetCoursesListBySchoolLevelID", {school_level_id:scs_school_level_id, year:scs_year, add_block_to_label:add_block_to_label}, function(course_list){
		scsFullCourseList	= course_list;
		$(course_list).each(function(i, course){
			$("#scs_course_id").append($("<option>").html(course.label).val(course.id));
		});
	});
}

function loadCourseSelectBySchoolLevelID(school_level_id){
	$("#course_select").load("/data/admin_data.php?action=Student::AJAX_BuildCourseSelectBySchoolLevelID&school_level_id="+school_level_id +"&"+$("input,select").serialize(), function(){
		$("#course_select_diag_course_id input:checked").each(function (i, item){
			$(item).attr("disabled", "disabled");
		});
	});
}

function BuildCourseListSelect(){
	var selection_method	= $("#course_select_diag_selection_method").val();
	var class_id			= $("#course_select_diag_class_id").val();
	var school_level_id		= $("#course_select_diag_school_id").val();
	var student_id			= $("#user_id").val();
	switch(selection_method){
		case "1":
			$.getJSON("/data/admin_data.php?action=Course::AJAX_GetJSONCoursesListByClassID", {class_id:class_id}, function(data){_buildCourseSelect(data);});
			break;
		case "2":
			$.getJSON("/data/admin_data.php?action=Student::AJAX_GetJSONCourseListByStudentID", {student_id:student_id}, function(data){_buildCourseSelect(data);});
			break;
		case "3":
			$.getJSON("/data/admin_data.php?action=Course::AJAX_GetCoursesListBySchoolLevelID", {school_level_id:school_level_id}, function(data){_buildCourseSelect(data);});
			break;
	}
}

function _buildCourseSelect(data){
	$('#course_select_diag_course_id').html("");
	$.each(data, function(i, item){
		$('#course_select_diag_course_id')
			.append($("<input type='checkbox'>").attr("name", "course_select_diag_course_id[]").val(item.id).attr("id", "course_"+item.id).addClass("small_input").addClass("option_available"))
			.append($("<label>").attr("for",  "course_"+item.id).attr("id", "label_"+item.id).html(item.label))
			.append("<br/>");
	});

	var course_list		= [];
	$("#course_list_container input").each(function(i, item){
		var course_id	= $(item).val();
		$("#course_"+course_id).attr("checked", true);
	});

	var course_list	= $("#active_course_list").val();
	course_list		= course_list.split(",")
	$.each(course_list, function (i, course_id){
		$("#course_"+course_id).attr("checked", true).attr("disabled", "disabled").removeClass("option_available");
	});
}

function evalCourseSelectUI(){
	var selection_method	= $("#course_select_diag_selection_method").val();

	$("#course_select_diag_school_id").val("0");
	$("#course_select_diag_class_id").val("0");

	$(".select_by_class").hide();
	$(".select_by_student").hide();
	$(".select_by_school").hide();
	switch(selection_method){
		case "1":$(".select_by_class").show();break;
		case "2":$(".select_by_student").show();break;
		case "3":$(".select_by_school").show();break;
	}
}

function composeEmail(recipients_user_id, subject, onSendFunction, unchecked_recipients_user_id){
	createDiv("email_diag");
	$("#email_diag").load("/content/dlg_email.php", {recipients_user_id:recipients_user_id, subject:subject, unchecked_recipients_user_id:unchecked_recipients_user_id}, function(){
		$("#email_diag").dialog({
			modal:true, position:"top", width:750, height:710, title:"send email",
			buttons:{
				"send":function(){
					sendEmail();
					if(undefined!=onSendFunction)onSendFunction();
				},
				"cancel":function(){$("#email_diag").dialog("close");}
			},
			open:function(){buildRTE();},
			close:function(){$("#email_diag").dialog("destroy");}
		})
	});
}

function sendEmail(){
	var to				= [];
	var subject			= $("#dlg_email_subject").val();
	var body			= $("#dlg_email_body").val();
	var email_to_self	= $("#dlg_email_bcc_yourself").val();
	var add_recipients	= $("#people_browser input").serialize();
	var file_ids		= [];
	var attachments		= $("[data-attachment='1']");
	attachments.each(function(a,e) {
		file_ids.push($(e).val());
	});
	$("#dlg_email_to input:checked").each(function(i, item){to.push($(item).val());})
	$.post("/data/admin_data.php?action=Email::AJAX_EMail",(add_recipients+"&"+$.param({'to[]':to, subject:subject, body:body, email_to_self:email_to_self, file_ids:file_ids})), function(){
		$("#email_diag").dialog("close");
	});
}


function getQueryString(param) {
	var result = {}, queryString = location.search.substring(1), re = /([^&=]+)=([^&]*)/g, m;
	while (m = re.exec(queryString)) {
		result[decodeURIComponent(m[1])] = decodeURIComponent(m[2]);
	}
	return undefined==result[param] ? "" : result[param];
}

function getAdjustedTime(time, adjustment_hour, adjustment_minute){
	var matrix	= time.split(":");
	var hour	= new Number(matrix[0]);
	var minute	= new Number(matrix[1]);
	var date	= new Date();
	date.setHours(hour + adjustment_hour);
	date.setMinutes(minute + adjustment_minute);
	return pad(date.getHours(),2) + ":" + pad(date.getMinutes(),2);
}

function pad(number, length) {
	var str = '' + number;
	while (str.length < length) {
		str = '0' + str;
	}
	return str;
}

function readAppointment(appointment_id){
	createDiv("new_appointment_container");
	$(".qtip").hide();
	$("#new_appointment_container").load("/data/common_handler.php?action=Appointment::AJAX_U_ViewAppointment",{appointment_id:appointment_id},  function(){
		$("#new_appointment_container").dialog({modal:true,position:"top",width:500,resizable:false,title:"Appointment",
			close:function(){$("#new_appointment_container").dialog("destroy")},
			buttons:{
				"close":function(){$("#new_appointment_container").dialog("close")}
			}
		});
	})
}

function checkForAvailableRooms(){
	var error_msg				 = "";
	var date					 = $("#appointment_date").val();
	var weekly					 = $("#weekly").attr("checked");
	var date_end				 = $("#appointment_date_end").val();
	var label					 = $("#appointment_label").val();
	var author_id				 = $("#apparent_author_id").val();
	var appointment_time_start	 = $("#appointment_time_start").val();
	var appointment_time_end	 = $("#appointment_time_end").val();
	var room_id					 = $("#room_id").val();
	var appointment_time_start	 = $("#appointment_time_start").val();
	var appointment_time_end	 = $("#appointment_time_end").val();

	error_msg					+= ""==date						? " - The date field is not set\n" : "";
	error_msg					+= ""==appointment_time_start	? " - The time start is not set\n" : "";
	error_msg					+= ""==appointment_time_end		? " - The time end is not set\n" : "";

	if(""==error_msg){
		findRoom();
	}else{
		alert("Correct the following error(s):\n\n"+error_msg+"\nOnce corrected, submit the information again.");
	}
}

function actionEditAppointment(appointment_id, apply_to_all){
	$("#apply_to_all").val(apply_to_all);
	$.get("/data/admin_data.php?action=Appointment::AJAX_ProcessPost&"+$("#new_appointment_container input,#new_appointment_container select").serialize(), function(){
		location.reload();
	});
}


function editAppointment(appointment_id, user_id, appointment_date, time_start, time_end, room_id, enable_datetimes, show_delete_button, no_room_check){
	time_start			= ""==time_start				? "" : time_start;
	time_end			= ""==time_end					? "" : time_end;
	room_id				= undefined==room_id			? "" : room_id;
	enable_datetimes	= undefined==enable_datetimes	? "" : enable_datetimes;
	no_room_check 		= undefined==no_room_check		? "" : no_room_check;
	$(".qtip").hide();
	createDiv("new_appointment_container");
	$("#new_appointment_container").load("/data/common_handler.php?action=Appointment::AJAX_U_BuildForm",
		{appointment_id:appointment_id, user_id:user_id, appointment_date:appointment_date, appointment_time_start:time_start, appointment_time_end:time_end, room_id:room_id, enable_datetimes:enable_datetimes},
		function(){
			checkForAvailableRooms();
			buttons = {};
			if(show_delete_button){
				buttons.delete = function(){
					if(confirm("Are you sure you want to delete this appointment?")){
						var apply_to_all = $("#apply_to_all").val();
						$.get("/data/admin_data.php?action=Appointment::AJAX_DeleteAppointment&appointment_id="+appointment_id+"&apply_to_all="+apply_to_all, function(){
							reloadCalendar();
						});
					}
				}
			}
			buttons.confirm = function(){
				var re						 = /^(([0-1]?\d[0-9])|([2][0-3])):([0-5]?[0-9])(:([0-5]?[0-9]))?$/;

				var error_msg				 = "";
				var rooms_checked			 = $("#rooms_checked").val();
				var date					 = $("#appointment_date").val();
				var weekly					 = $("#weekly").attr("checked");
				var date_end				 = $("#appointment_date_end").val();
				var label					 = $("#appointment_label").val();
				var author_id				 = $("#apparent_author_id").val();
				var appointment_time_start	 = $("#appointment_time_start").val();
				var appointment_time_end	 = $("#appointment_time_end").val();
				var room_id					 = $("#room_id").val();
				var appointment_time_start	 = $("#appointment_time_start").val();
				var appointment_time_end	 = $("#appointment_time_end").val();
				var appointment_group_id	 = $("#appointment_group_id").val();


				error_msg					+= ""==appointment_time_start	? " - The time start is not set\n" : "";
				error_msg					+= ""==appointment_time_end		? " - The time end is not set\n" : "";
				if(''==error_msg){
					error_msg 				+= !appointment_time_start.match(re) ? " - The time start is not valid\n" : "";
					error_msg 				+= !appointment_time_end.match(re) ? " - The time end is not valid\n" : "";
				}

				error_msg					+= ""==label					? " - The description field is empty\n" : "";
				error_msg					+= ""==date						? " - The date field is not set\n" : "";
				error_msg					+= ""==author_id				? " - The 'assigned to' field is empty\n" : "";


				if(""==error_msg){
					var r = true;
					if(!room_id&&no_room_check){
						var r = confirm("You have no room selected, save anyway?");
					}

					if(r){
						findRoom(true);
					}

				}else{
					alert("Correct the following error(s):\n\n"+error_msg+"\nOnce corrected, submit the information again.");
				}
			};
			buttons.cancel = function(){
				$("#new_appointment_container").dialog("close")
			};
			$("#new_appointment_container").dialog({modal:true,position:"top",width:565,resizable:false,title:"Appointment",
				close:function(){$("#new_appointment_container").dialog("destroy")},
				buttons:buttons
			});
			if(time_end==""&&enable_datetimes&&appointment_id==0){
				updateEndTime();
			}
		}
	);
}

function viewAppointments(appointment_date, room_id){
	room_id				= undefined==room_id			? "" : room_id;
	$(".qtip").hide();
	createDiv("new_appointment_container");
	$("#new_appointment_container").load("/data/common_handler.php?action=Appointment::AJAX_U_BuildViewAppointments",
		{appointment_date:appointment_date, room_id:room_id},
		function(){
			buttons = {};
			buttons.cancel = function(){
				$("#new_appointment_container").dialog("close")
			};
			$("#new_appointment_container").dialog({modal:true,position:"top",width:800,resizable:true,title:"Appointment",
				close:function(){$("#new_appointment_container").dialog("destroy")},
				buttons:buttons
			});
			if(time_end==""&&enable_datetimes&&appointment_id==0){
				updateEndTime();
			}
			$('.room_calendar').fullCalendar({
				defaultView: 'month',
				timeFormat: 'H:mm',
				hiddenDays: calendar_hidden_day_list,
				minTime: 	calendar_day_start,
				maxTime: 	calendar_day_end,
				firstDay: 	1,
				columnFormat: {
					week: calendar_week_format,
				},
				header: {
					left: 	'prev,next today',
					center: 'title',
					right: 	'month,agendaWeek,agendaDay'
				},
				events:{
					url: 	'/data/admin_data.php?action=Room::AJAX_GetSchedule',
					type: 	'POST',
					data:{
						room_id 		 : 	room_id,
						inc_appointment  : 	true
					}
				},
				dayClick: function(date, allDay, jsEvent, view) {
					var hour		= date.getHours();
					var minutes		= pad(date.getMinutes(), 2);
					var start_time	= hour + ':' + minutes;
					var end_time	= (hour+1) + ':' + minutes;
					editAppointment(0, user_id, formatDate(date), start_time, end_time, room_id, "TRUE");
				},
				eventRender: function(event, element) {
					var current_view	=  $('#calendar').fullCalendar('getView');
					if('agendaWeek'==current_view.name||'agendaDay'==current_view.name){
						$(element).find('.fc-event-inner').append($('<div class="course_info">').html(event.teacher_list));
					}
				}
			});
			$(".room_calendar").removeClass('room_calendar');
		}
	);

}

function editAuthoredAppointments(user_id){
    wait_message.show();
	createDiv("authored_appointments_container");
	$("#authored_appointments_container").load("/data/admin_data.php?action=Appointment::AJAX_BuildAuthoredForm",
		{},
		function(){
			$("#authored_appointments_container").dialog({modal:true,position:"top",width:700,resizable:true,title:"Appointment",
				close:function(){$("#authored_appointments_container").dialog("destroy")},
				buttons:{
					"edit":function(){
						var appointment_id = parseInt($("#appointments").val());
						if(appointment_id){
							editAppointment(appointment_id, "", "", "", "", "", "TRUE");
							$("#authored_appointments_container").dialog("close");
						}
					},
					"delete":function(){
						if($("#appointments").val()){
							var values = $("#appointments").val()[0].split("-");
							deleteAppointment(values[0],values[1]);
							$("#authored_appointments_container").dialog("close");
						}
					},
					"cancel":function(){$("#authored_appointments_container").dialog("close")}
				}

		});wait_message.hide();
	});
}

function appointmentDateChange(){
	setRoomsChecked(0);
	$.getJSON("/data/admin_data.php?action=Appointment::AJAX_FetchRepeatOptions&date="+$("#appointment_date").val(),
	function(data){
		$("#repeat option").remove();
		$.each(data, function(value, option){
			$("#repeat").append("<option value='"+value+"'>"+option+"</option>");
		})
	});
}
function appointmentRepeatChange() {
	setRoomsChecked(0);
	if($("#repeat").val() > 0){
		$("#repeat_until_row").removeClass("hidden");
	}else{
		$("#repeat_until_row").addClass("hidden");
	}
}

function setRoomsChecked(val){
	$("#rooms_checked").val(val);
	$("#room_id option").remove();
	$("#room_id optgroup").remove();
	$("#room_id").hide();
	if(val==0){
		$("#find_rooms_link").show();
	}else{
		$("#find_rooms_link").hide();
	}
}

function findRoom(submit){
	wait_message.show();
	var error_message		 = "";
	var date				 = $("#appointment_date").val();
	var time_start			 = $("#appointment_time_start").val();
	var time_end			 = $("#appointment_time_end").val();
	var repeat				 = $("#repeat").val();
	var appointment_id 		 = $("#appointment_id").val();
	var room_id 		 	 = $("#room_id").val();
    var set_room_id 		 = $("#set_room_id").val();
    if(set_room_id>0 && room_id==null){
        room_id = set_room_id;
	}
	$("#room_id").show().addClass("search_field ui-autocomplete-input ui-autocomplete-loading");
	$.getJSON("/data/admin_data.php?action=Appointment::AJAX_ValidateAppointment&"+$("#new_appointment_container input,#new_appointment_container select").serialize(), function(data){
		$("#room_id option").remove();
		$("#room_id optgroup").remove();
		$("#appointment_msg li").remove();
		//$("#appointment_msg").css("display", "none");
		$("#room_id").removeClass("search_field ui-autocomplete-input ui-autocomplete-loading");
		var printed_building_labels = Array();

		if(data.error_list.length>0){
			var full_error_message	 = '';
			$.each(data.error_list, function(i, error_message){
				full_error_message	+= ' - ' + error_message + '\n';
			});
			alert(full_error_message);
		}

		if($(data.rooms_available).toArray().length>0){
			setRoomsChecked(1);
		}

		$("#room_id").append("<option value='' selected></option>");

		$.each(data.rooms_available, function(index,item) {
			//populate room select with available rooms in all days!
			var building_id 		= data.building_room_map[index];
			var cur_building_label 	= data.building_list[building_id];
			var found 				= jQuery.inArray(cur_building_label, printed_building_labels);
			$("#room_id").show();

			if(building_id){
				if(found < 0) { //if building has not been created yet we create and append
					if(room_id==index){ //if selected/saved room is still available re-select it again..
						$("#room_id").append('<optgroup id="' +building_id + '" name="' +building_id + '" label="' +cur_building_label + '">');
						$('#' + building_id).append("<option value='" + index + "'' selected>" + item + "</option>");
					}else{
						$("#room_id").append('<optgroup id="' +building_id + '" name="' +building_id + '" label="' +cur_building_label + '">');
						$('#' + building_id).append("<option value='" + index + "''>" + item + "</option>");
					}
					printed_building_labels.push(cur_building_label);
				}else{ //else building has been created we append to building
					if(room_id==index){ //if selected/saved room is still available re-select it again..
						$('#' + building_id).append("<option value='" + index + "'' selected>" + item + "</option>");
					}else{
						$('#' + building_id).append("<option value='" + index + "''>" + item + "</option>");
					}
				}
			}else{
				if(room_id==index){ //if selected/saved room is still available re-select it again..
					$("#room_id").append("<option value='" + index + "'' selected>" + item + "</option>");
				}else{
					$("#room_id").append("<option value='" + index + "''>" + item + "</option>");
				}
			}
		});

		$.each(data.appointment_dates, function(index,item) {
			if(!item){
				//$("#appointment_msg").css("display", "block");
				$("#appointment_msg ul").append("<li>'"+index+"' no rooms available</li>");
			}
		});

		if(data.author_in_assigned){
			$.each(data.user_appointments, function(index,item) {
				if(item){
					//$("#appointment_msg").css("display", "block");
					$("#appointment_msg ul").append("<li class='appointment'>Conflicting appointment on '"+item.appointment_date+"' : '"+item.appointment_label+"'</li>");
				}
			});
			$.each(data.course_schedule, function(index,item) {
				if(item){
					//$("#appointment_msg").css("display", "block");
					$("#appointment_msg ul").append("<li class='appointment'>Conflicting course schedule on period '"+item.period_label+"'</li>");
				}
			});
		}

		if(submit){
			var r = true;
			if($("#appointment_msg").find('li.appointment').length > 0){
				var error = '\n\n';
				$("#appointment_msg li").each(function(){
					error = error + ' - ' + $(this).html() + '\n';
				});
				var r = confirm("There are clashes with your appointment:" + error + '\n\nSave anyway?' );
			}
			if(r){
				$.get("/data/admin_data.php?action=Appointment::AJAX_ProcessPost&"+$("#new_appointment_container input,#new_appointment_container select").serialize(), function(){
					reloadCalendar();
				});
			}
		}
	});
	wait_message.hide();
}

function reloadCalendar(){
	if($('#calendar').length){
		$('#calendar').fullCalendar('refetchEvents');
		$("#new_appointment_container").dialog("close");
	}else{
		location.reload();
	}
}

function actionDeleteAppointment(appointment_id, apply_to_all){
	$.getJSON("/data/admin_data.php?action=Appointment::AJAX_DeleteAppointment", {appointment_id:appointment_id,apply_to_all:apply_to_all}, function(){
		location.reload();
	});
}

function deleteAppointment(appointment_id, is_part_of_group){
	$(".qtip").hide();
	var apply_to_all = 'FALSE';
	if(is_part_of_group==1){
		createDiv("confirm_container");
		$("#confirm_container").load("/data/admin_data.php?action=Appointment::AJAX_BuildConfirmDeleteForm", {appointment_id:appointment_id}, function(){
		$("#confirm_container").dialog({modal:true,position:"top",width:565,resizable:false,title:"Appointment",
				close:function(){$("#confirm_container").dialog("destroy")},
				buttons:{
					"cancel":function(){
						$("#confirm_container").dialog("destroy");
					}
				}
			});
		});
	}else{
		createDiv("confirm_container");
		$("#confirm_container").text("Are you sure you want to delete this appointment?");
		$("#confirm_container").dialog({modal:true,position:"top",width:500,resizable:false,title:"Delete appointment",
			close:function(){$("#confirm_container").dialog("destroy")},
			buttons:{
				"ok":function(){
					$.getJSON("/data/admin_data.php?action=Appointment::AJAX_DeleteAppointment", {appointment_id:appointment_id,apply_to_all:apply_to_all}, function(){
						location.reload();
					});
				},
				"cancel":function(){
					$("#confirm_container").dialog("destroy");
				}
			}
		});
	}
}

function userEditScreenInit(){
	evaluateDirt();
	if(is_new){
		$("#tab_container").tabs({
			selected:0,
			show: function(event, ui) {
				$('#calendar').fullCalendar('render');
			}
		});
	}else{
		$("#tab_container").tabs({
			cookie:{expires:30,name:"student"},
			show: function(event, ui) {
				$('#calendar').fullCalendar('render');
			}
		});
	}
	wait_msg	= new waitMessage();
	// loadAbsenteismDetails();
	$("#contact_tabs").tabs({cache:false});
	$(".autoexpand").TextAreaExpander(19);
	var file_uploader = new plupload.Uploader({
		runtimes: 'html5,html4',
		multi_selection : true,
		browse_button:'file_picker',
		url:'/data/upload.php?direct=1',
		container : document.getElementById('container'),
		filters : {
			max_file_size : upload_max_filesize,
		},
		init: {
			PostInit: function() {
				$('#progress').hide().html('');
				$('#file_picker').show();
			},
			Error: function(up, err) {
				var message;
				switch (err.code) {
					case -601: 	// filetype error
						message = 'File "' + err.file.name + '" is not a valid mime type for this upload';
					break;
					case -600: 	// filesize error
						message = 'File "' + err.file.name + '" is larger than the maximum allowed size of ' + upload_max_filesize;
					break;
					default:
						message = 'There was a problem processing ' + err.file.name;
					break;
				}
				alert(err.message + '\n\n' + message);
			},
			FilesAdded: function(up, files) {
				is_uploading	= true;
			//	$("#uploaded_file_table .no_data").hide();
				plupload.each(files, function(file) {
					var id		= file.id;
					$.getJSON('/data/admin_data.php?action=File::AJAX_GetFileTypeList', {}, function(file_type_list){
						var file_type_select	= $('<select id="type_'+file.id+'" name="new_file_type_id[]" class="form-control"/>');
						file_type_select.append($('<option>').html('').val(0));
						$(file_type_list).each(function(i, file_type){
							file_type_select.append($('<option>').html(file_type.label).val(file_type.id));
						});

						$('#uploaded_file_table .no_data').remove();
						$('#uploaded_file_table tbody').append(
							$("<tr>")
								.attr('id', 'new_file_'+file.id)
								.append($('<td>').append($("<input name='new_file_name[]' readonly='readonly' style='border:0;width:75%;background-color:transparent;'>").val(file.name)))
								.append($('<td>').append(file_type_select))
								.append($('<td><input id="desc_'+file.id+'" name="new_file_description[]" class="form-control"/></td>'))
								.append($('<td class="center">').html($.datepicker.formatDate(jquery_date_format, new Date())))
								.append($('<td><input id="expiry_'+file.id+'" name="new_file_expiry_date[]" class="datepicker form-control"/></td>'))

								.append(
									$('<td>')
										.append($("<span class='ui-red-icon ui-icon-close pointer' style='float:right;'>").click(function(){
											up.removeFile(file);
											var file_id = $("#uploadfile_" + file.id).val();
											$("#uploadfile_" + file.id).remove();
											var target = "#new_file_" + file.id;
											deleteFile(file_id, target);
										}))
										.append("<div class='ui-autocomplete-loading' style='float:right;width:50px;margin-left:6px;margin-right:6px'>&nbsp;<div>")
								)
						);
					});
				});
				$('#progress').hide().html('');
				for(var c = 0; c < 99999999; c++) { /* balls */ }
				up.start();
			},
			UploadProgress: function(up, file) {
				var percent = file.percent;
				if (percent > 99) percent = 99;
				$('#new_file_'+file.id).find('.ui-autocomplete-loading').html(percent + "%");
			},
			UploadComplete: function(up, files){
				is_uploading	= false;
			},
			FileUploaded: function(up, file, object) {
				try { // gareth: Handle getting the json response MSMID
					response = eval(object.response);
				} catch(err) {
					response = eval('(' + object.response + ')');
				} // create new hidden inputs in the form for file_ids
				var extra = $('<input>')
					.attr('id', 'uploadfile_' + file.id)
					.attr('type', 'hidden')
					.attr('name', 'file_ids[]')
					.attr('value', parseInt(response.id));
				$('form.uploadable').append(extra);
				$('#desc_' + file.id).attr('name', 'new_file_description['+response.id+']');
				$('#type_' + file.id).attr('name', 'new_file_type_id['+response.id+']');
				$('#expiry_' + file.id).attr('name', 'new_file_expiry_date['+response.id+']');
				$('#new_file_'+file.id).find('.ui-autocomplete-loading').html("100%");
				$('#new_file_'+file.id).find('.ui-autocomplete-loading').removeClass("ui-autocomplete-loading");
			}
		}
	});
	function addFileToDeleteList(file_id) {
		$("form.uploadable").append($("<input type='hidden' name='delete_file_id[]'>").val(file_id));
	}

	function deleteFile(file_id, target){
		addFileToDeleteList(file_id);
		$(target).remove();
	}
	file_uploader.init();
	// loadSubjectTable(true);
	$(".required").each(function(i, field){
		if($(field).hasClass("datepicker")){
			$(field).next().after("&nbsp;<img src='/resources/005.gif' alt='Mandatory field'>");
		}else{
			$(field).after("&nbsp;<img src='/resources/005.gif' alt='Mandatory field'>");
		}
	})
	wait_message.hide();
}

function saveClass(){
	var valError	 = "";
	valError		+= ""==$("#class_level_id").val()	? " - The class level is missing\n" : "";
	valError		+= ""==$("#year").val()				? " - The year is missing\n" : "";
	valError		+= !isClassLabelUnique()			? " - A class with the same unique identifier already exists.\n" : "";

	$("input.required,select.required").each(function(i, item){
		valError	+= ""==$(item).val()				? " - The " + $(item).prop("title") + " is missing\n" : "";
	});

	if (""!=valError) {
		alert("The following validation error(s) have been encountered:\n\n" + valError + "\nCorrect the listed error(s) to continue.");
	} else {
		markAsClean();
		wait_message.show();
		$("#class_form").submit();
	}
}

function fetchCourseInformation(){
	var subject_id			= $("#subject_id").val();
	var year				= $("#school_year").val();

	$("#session_id").html("");
	$.getJSON("/data/admin_data.php?action=Subject::AJAX_GetSubjectBySubjectID", {subject_id:subject_id, year:year}, function(subject){
		if(''==$("#course_label").val()){
			$("#course_label").val(subject.subject_label);
		}

		$("#course_credit").val(subject.subject_credit);
		$("#periods_per_lesson").val(subject.periods_per_lesson);
		$("#periods_per_week").val(subject.periods_per_week);
		$("#course_capacity").val(subject.subject_capacity);

		$.each(subject.sessions, function(i, session){
			$('#session_id').append($("<div/>")
				.append($("<input name='session_id[]' type='checkbox' class='small_input' checked='checked'>").val(session.session_id).prop("id", "session_"+session.session_id))
				.append($("<label>").html(session.score_card_session_label).prop("for", "session_"+session.session_id))
			);
		});
	});

	buildCalendar();
}

function sgsUIEval(){
	var school_group_id	= $("#sgs_school_group_id").val();
	$(".sgs_selection_row").hide();
	switch(school_group_id){
		case "1": 	$(".school_related").show();		break;
		case "2": 	$(".school_level_related").show();	break;
		case "3": 	$(".class_level_related").show();	break;
		case "4": 	$(".class_related").show();			break;
		case "5": 	$(".course_related").show();		break;
	}
}

function clearPeopleSelection(){
	 $("#people_selected_container").html("");
}

function openPeopleBrowser(target_field_id, target_list){
	var role_id				= $('#'+target_field_id).attr('role_id');
	var include_my_classes	= $('#'+target_field_id).attr('include_my_classes');
	var include_my_courses	= $('#'+target_field_id).attr('include_my_courses');
	var include_my_subjects	= $('#'+target_field_id).attr('include_my_subjects');

	if($("#people_browser").size()==0){
		$("body").append(
			'<div id="people_browser">' +
				'<div id="people_browser_lp">' +
					'<div style="width: 98%;border: 1px dotted #000;overflow-x: auto;margin-bottom: 5px;">' +
						'<input id="browser_search" class="search_field" style="width:100%;margin-bottom:2px">' +
						'<div id="people_browser_tree"></div>' +
					'</div>' +
					'<div id="people_browser_selection_details"></div>' +
				'</div>' +
				'<div id="people_browser_rp">' +
					'<div id="people_selected_container"></div>'+
					'<a href="javascript:clearPeopleSelection()" tabindex="-1">clear selection</a>' +
				'</div>' +
			'</div>');
	}

	var bodyWidth = $("body").width();
	var modalWidth = 700;
	if(bodyWidth < modalWidth){
		modalWidth = bodyWidth;
	}

	$("#people_browser").dialog({modal:true, position:"top", resizable:false, title:"People picker", width:modalWidth,
		buttons:{
			"Select":function(){
				var counter = 0;
				$("#"+target_field_id).html("");
				$("#people_selected_container div").each(function(i, div){
					counter	 +=1;
					$(div).clone()
						.attr("old_id", $(this).attr("id"))
						.removeAttr("id")
						.appendTo("#"+target_field_id);
				});
				$("#"+target_field_id).change();
				$("#people_browser").dialog("close");
			},
			"Cancel":function(){$("#people_browser").dialog("close");}
		},
		open:function(){
			$("#people_selected_container").html("");
			$("#"+target_field_id+" div").each(function(i, div){
				var is_flattened	= $(this).attr("is_flattened");
				var new_id 			= $(this).attr("old_id");

				$(div).clone()
					.attr("id", new_id)
					.removeAttr("old_id")
					.appendTo("#people_selected_container")
					.find(".ui-icon-pencil").click(function(){
						wait_message.show();
						if(is_flattened){
							editFlattenedGroup(new_id);
						}else{
							var key_holder	= $(div).find('input');
							var key 		= $(key_holder).attr('name');
							key 			= key.replace('[]', '');
							var value 		= $(key_holder).val();
							editSubgroup(key, value);
						}
					});

				$("#"+escapeSB(new_id)).find(".ui-icon-close").click(function(){$("#"+escapeSB(new_id)).remove();});
			});

			$("#browser_search").categorised_search({
				minLength:3,
				source: function(request, response) {
					$.getJSON(
						"/data/admin_data.php?action=Browser::AJAX_SuperSearch",
						{
							search_string		: request.term,
							role_id				: role_id,
							include_my_classes	: include_my_classes,
							include_my_courses	: include_my_courses,
							include_my_subjects	: include_my_subjects
						},
						response);
				},
				select: function(event,ui) {
					fetchSubgroup(ui.item.source_type, ui.item.source_key, target_list);
					$("#browser_search").val("");
					return false;
				}
			});

			$("#people_browser_tree").dynatree({
				autoCollapse: true,clickFolderMode:3,autoFocus:false,debugLevel:0,imagePath:'/css/images/', fx: { height: "toggle", duration: 200 },
				initAjax: {url:"/data/admin_data.php?action=Browser::AJAX_GetRoot",data:{role_id:role_id,include_my_classes	: include_my_classes,include_my_courses	: include_my_courses,include_my_subjects	: include_my_subjects}},
				onActivate: function(node) {fetchSubgroup(node.data.source, node.data.key, target_list)},
				onLazyRead: function(node){node.appendAjax({url: "/data/admin_data.php?action=Browser::AJAX_GetChildren",data: {key: node.data.key, source: node.data.source, target_list:target_list, role_id:role_id}});},
				onSelect: function(flag, node){alert(flag)}
			});
		}
	});
}

function editFlattenedGroup(source_id){
    createDiv("sub_group_edit");
    $("#sub_group_edit").html("");
    $("#" + source_id+" input").each(function(i, field){
        user_id     = $(field).val();
        user_name   = $(field).attr('user_name');
        $("#sub_group_edit")
            .append($("<input type='checkbox' class='small_input flattened_group_member' checked='checked'>").val(user_id).attr("id", "con_"+user_id).attr("alt", user_name))
            .append($("<label>").html(user_name).attr("for", "con_"+user_id))
            .append("<br>");
    });
    $("#sub_group_edit").dialog({
        modal:true,height:350,position:"top",title:"edit group", width:500,
        open:function(){wait_message.hide();},
        buttons:{
            "update":function(){
                $("#"+source_id).remove();
                var user_count      = $("input.flattened_group_member:checked").size();
                var unid            = buildID();
                $("#people_selected_container").append(
                    $("<div is_flattened='true' class='Student'>")
                        .text(user_count+ ' users')
                        .attr('id', unid)
                        .append($("<span class='ui-icon ui-icon-close pointer' style='float:right'></span>").click(function(){$("#"+unid).remove()}))
                        .append($("<span class='ui-icon ui-icon-pencil pointer' style='float:right'></span>").click(function(){editFlattenedGroup(unid)}))
                );

                $("#sub_group_edit input:checked").each(function(i, selected_contact){
                     var user_id    = $(selected_contact).val();
                     var user_name  = $(selected_contact).attr('alt');
                     $("#"+unid).append($("<input type='hidden' name='c[]'>").val(user_id).attr('user_name', user_name));
                 });
                 $("#sub_group_edit").dialog("close");
             },
            "cancel":function(){
                $("#sub_group_edit").dialog("close");
            }
        }
    });
}

function fetchSubgroup(source_type, source_key, target_list){
	$("#people_browser_selection_details").load("/data/admin_data.php?action=Browser::AJAX_FetchSubGroups", {source:source_type, key:source_key, "target_list[]":target_list}, function(){
		$("#people_browser_selection_details input").click(function(){
			var value		= $(this).val();
			var source_id	= $(this).attr("id")
			var target_id	= source_id + value;
			var icon_base_class = 'ui-icon';

			if($(this).hasClass('student')){
				icon_base_class = 'ui-white-icon';
			} else if($(this).hasClass('main_guardians')){
				icon_base_class = 'ui-orange-icon';
			}


			if($(this).attr("checked")){
				var div		= $("<div>")
								.attr("id", target_id)
								.addClass($(this).attr("class"))
								.append($("<span style='width:90%;border:0;float:left'></span>").text($(this).attr("label")))
								.append(
									$("<span class='ui-icon-close pointer' style='float:right'></span>")
										.click(function(){
											$("#" + escapeSB(target_id)).remove();
										})
										.addClass(icon_base_class)
									)
								.append($("<input type='hidden'/>").val(value).attr("name", source_id+"[]"));
				if('c'!=source_id){
					div.append(
						$("<span class='ui-icon-pencil pointer' style='float:right'></span>")
							.click(function(){editSubgroup(source_id, value)})
							.addClass(icon_base_class)
					);
				}

				//console.log(this);
				// if('rgba(0, 0, 0, 0)' ==$("#"+target_id).css('background-color')){
				// 	div.find('.ui-white-icon').removeClass('ui-white-icon').addClass('ui-icon');
				// }
				$("#people_selected_container").append(div);
			}else{
				$("#" + escapeSB(target_id)).remove();
			}
		});
	});
}

function editSubgroup(key, value){
	createDiv("sub_group_edit");
	$("#sub_group_edit").html("");
	wait_message.show();
	$.getJSON("/data/admin_data.php?action=Field::AJAX_ProcessPeopleSelect&"+key+"[]="+value, function(contacts){
		$("#sub_group_edit").append("<table cellpadding='2' cellspacing='0'><tr><td class='th'><input type='checkbox' id='header_checkbox' class='small_input header_checkbox' checked='checked' onclick='evalCheckboxes()'/><label for='header_checkbox'>Name</label>")
		$(contacts).each(function(i, contact){
			$("#sub_group_edit")
				.append($("<input type='checkbox' class='small_input flattened_group_member' checked='checked'>").val(contact.id).attr("id", "con_"+contact.id).attr("alt", contact.label))
				.append($("<label>").html(contact.label).attr("for", "con_"+contact.id))
				.append("<br>");
		});
		wait_message.hide();

		$("#sub_group_edit").dialog({modal:true,height:350,position:"top",title:"edit group", width:500, buttons:{
			"update":function(){
				$("#sub_group_edit").dialog("close");
				$("#"+escapeSB(key+value)).remove();


				$("input.flattened_group_member:checked").each(function(i, selected_contact){
					var user_id	= $(selected_contact).val();
					var target_id  = "c"+$(selected_contact).val()
					$("#people_selected_container").append(
						$("<div class='Student'>")
							.attr("id", target_id)
							.html($(selected_contact).attr("alt"))
							.append($("<span class='ui-icon ui-icon-close pointer' style='float:right'></span>").click(function(){$("#"+target_id).remove()}))
							.append($("<input type='hidden' name='c[]'>").val(user_id))
					);
				});
			 },
			"cancel":function(){
				$("#sub_group_edit").dialog("close");
			}
		}});
	});
}

function displayImpersonateScreen(){
	createDiv('impersonate_screen');
	$('#impersonate_screen').load('/data/admin_data.php?action=User::AJAX_BuildImpersonateScreen', {}, function(){
		buildPeopleSearchField();
		$('#impersonate_screen').dialog({modal:true, position:"top", title:"Impersonate User", buttons:{
			"impersonate":function(){
				var user_id		= $("#impersonate_user_id").val();
				if(!user_id){
					alert('You need to select a user by searching by name/surname.');
				}else{
					wait_message.show();

					$.getJSON("/?_switch_user=" + user_id, function(logs){
						if(0==logs.errors.length){
							location.href		 = "/";
						}else{
							wait_message.hide();
							var error_message	 = "";
							$(logs.errors).each(function(i, error){
								error_message	+= " - " + error + "\n";
							});
							alert("The system could not proceed with your request for the following reason(s):\n" + error_message);
						}
					});
				}
			},
			"cancel":function(){
				$('#impersonate_screen').dialog("close");
			}
		}});
		$("#mock_impersonate_user_id").focus();
	});
}

function displaySwitchSchoolScreen(){
	createDiv('switch_school_screen');
	$('#switch_school_screen').load('/data/common_handler.php?action=User::AJAX_U_BuildSwitchSchoolScreen', {}, function(){
		createSchoolSelectCombo();
		$('#switch_school_screen').dialog({modal:true, position:"top", title:"Switch School", dialogClass : "school-switcher-dialog", buttons:{
			"switch":function(){
				var school_id		= $("#switch_school_id").val();
				if(!school_id || school_id == 0){
					alert('You need to select a school to switch to.');
				}else{
					wait_message.show();

					$.get("/?_switch_school=" + school_id, function(logs){
						try {
							logs = JSON.parse(logs);
						} catch(e) {
							logs = {errors:[]};
						}
						if(0==logs.errors.length){
							location.href		 = "/";
						}else{
							wait_message.hide();
							var error_message	 = "";
							$(logs.errors).each(function(i, error){
								error_message	+= " - " + error + "\n";
							});
							alert("The system could not proceed with your request for the following reason(s):\n" + error_message);
						}
					});
				}
			},
			"cancel":function(){
				$('#switch_school_screen').dialog("close");
			}
		}});
	});
}

function displayActiveYearScreen(){
	createDiv('year_picker_screen');
	$('#year_picker_screen').load('/data/admin_data.php?action=Year::AJAX_BuildYearPickerScreen', {}, function(){
		$('#year_picker_screen').dialog({modal:true, position:"top", title:"Active year", width:500, buttons:{
			"set":function(){
				wait_message.show();
				var academic_year_id 	= $('#academic_year_id').val();

				$.get("/?_switch_academic_year=" + academic_year_id, function(logs, a, b, c){
					try {
						logs = JSON.parse(logs);
					} catch(e) {
						logs = {errors:[]};
					}
					if(0==logs.errors.length){
						location.href		 = "/";
					}else{
						wait_message.hide();
						var error_message	 = "";
						$(logs.errors).each(function(i, error){
							error_message	+= " - " + error + "\n";
						});
						alert("The system could not proceed with your request for the following reason(s):\n" + error_message);
					}
				});
			},
			"cancel":function(){
				$('#year_picker_screen').dialog("close");
			}
		}});
	});
}

function evalCheckboxes(){
	if($("#header_checkbox").attr("checked")){
		$("#sub_group_edit input[type=checkbox]").attr("checked",'checked');
	}else{
		$("#sub_group_edit input[type=checkbox]").removeAttr('checked');
	}
}

function nl2br (str, is_xhtml) {
	var breakTag = (is_xhtml || typeof is_xhtml === 'undefined') ? '<br />' : '<br>';
	return (str + '').replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1' + breakTag + '$2');
}

function BuildCheckBoxFromJSONList(json_list, target_id, onchange_function, is_checked){
	var were_entries_found	= false;
	is_checked				= is_checked==undefined ? false : true;
	$('#'+target_id).html("");
	$(json_list).each(function(i, json_entry){
		were_entries_found	= true;
		$('#'+target_id)
			.append(
				$('<input type="checkbox" class="small_input">')
					.attr('name', target_id+'[]')
					.attr('checked', is_checked)
					.val(json_entry.id)
					.attr('id', target_id+'-'+json_entry.id)
					.change(function(){onchange_function==undefined ? null : onchange_function()}))
			.append($('<label>').html(json_entry.label).attr('for', target_id+'-'+json_entry.id))
			.append('<br />');
	});

	if(!were_entries_found){
		$('#'+target_id).html("<span style='font-style:italic;color:grey'>no entries found</span>");
	}
}


function populateSelectFromJSONList(json_list, target_id, include_blank){
	target_id	= escapeSB(target_id);

	if(include_blank){
		$('#'+target_id).html("<option value=''></option>");
	}else{
		$('#'+target_id).html("");
	}
	var last_option_group_label	= '';
	var last_option_group_id	= '';
	$(json_list).each(function(i, json_entry){
		if(json_entry.hasOwnProperty('category')){
			level = json_entry.category;

			if(last_option_group_label!=level){
				last_option_group_id = buildID();
				group = $("<optgroup/>").attr('id', last_option_group_id).attr('label', level);
				$('#'+target_id).append(group);
			}

			group.append($('<option>').val(json_entry.id).html(json_entry.label));
			last_option_group_label = level;
		}else{
			$('#'+target_id).append($('<option>').val(json_entry.id).html(json_entry.label));
		}
	});
}

jQuery.expr[':'].Contains = function(a,i,m){
	return jQuery(a).text().toUpperCase().indexOf(m[3].toUpperCase())>=0;
};

$.widget("custom.categorised_search", $.ui.autocomplete, {
	_renderMenu: function( ul, items ) {
		var self = this, currentCategory = "";
		$.each( items, function( index, item ) {
			if ( item.category != currentCategory && item.category != undefined) {
				ul.append( "<li class='ui-autocomplete-category'>" + item.category + "</li>" );
				currentCategory = item.category;
			}
			self._renderItem(ul, item);
		});
	},
	_renderItem:function(ul, item){
		meta_label = item.meta==undefined ? '' : ' <small>'+item.meta+'</small>'
		return jQuery("<li></li>")
			.attr("title",'ID: '+item.id)
			.data("item.autocomplete",item)
			.append(jQuery("<a></a>").html(item.label + meta_label))
			.appendTo(ul);
	}
});

function buildCountrySearchField(){
	$(".country_search_field").country_search_field().addClass("search_field");
}

function buildPortraitTooltip(){
	$('.portrait_tooltip').each(function(i, item){
		var user_id		= $(item).attr('user_id');
		$(item).addClass('pointer');
		$(item).qtip({
			position:{target: 'event', viewport: $(window), my: 'top middle', at:'bottom middle'},
			content: {
				text: 'Loading...',
				ajax: {
					url: '/data/admin_data.php?action=Contact::AJAX_BuildPortrait',
					type: 'GET',
					data: {
						user_id:user_id
					}
				}
			}
		});
	});
}


$.widget( "custom.country_search_field", {
	_create: function() {
		this.wrapper = $( "<span>" )
			.addClass( "school-switcher-combobox" )
			.insertAfter( this.element );

		this._createAutocomplete();
		this._createShowAllButton();
	},

	_createAutocomplete: function() {
		this.element
			.appendTo(this.wrapper)
			.attr("title", "")
			.addClass("custom-combobox-input ui-widget ui-widget-content")
			.css('float', 'left')
			.categorised_search({
				delay: 0,
				minLength: 0,
				source: $.proxy( this, "_source" )
			});
	},

	_createShowAllButton: function() {
		var input = this.element, wasOpen = false;

		$( "<button type='button' class='field_button ui-corner-right' style='width:20px'>" )
			.attr( "tabIndex", -1 )
			.appendTo( this.wrapper )
			.button({icons:{primary:"ui-icon-triangle-1-s"},text: false})
			.removeClass( "ui-corner-all" )
			.addClass( "" )
			.mousedown(function() {
				wasOpen = input.categorised_search( "widget" ).is( ":visible" );
			})
			.click(function() {
				input.focus();
// Close if already visible
				if ( wasOpen ) {
					return;
				}

// Pass empty string as value to search for, displaying all results
				input.categorised_search( "search", "###" );
			});
	},

	_source: function(request, response) {
		$.getJSON("/data/admin_data.php?action=Country::AJAX_GetJSONCountryListBySearch", {search_string: request.term}, response);
	},

	_destroy: function() {
		this.wrapper.remove();
		this.element.show();
	}
});


function editTransferUser(user_id, transfer_id){
	createDiv('transfer_user_container');
	$('#transfer_user_container').load(
		'/data/admin_data.php?action=Transfer_User::AJAX_BuildTransferUserEdit',
		{
			user_id: user_id,
			transfer_id: transfer_id
		},
		function(){
			$('#transfer_user_container').dialog({
				modal:true, width:500, position:'top',
				buttons:{
					'save':function(){
						var departure_dropoff_location_id	= $('#departure_dropoff_location_id').val();
						var return_pickup_location_id		= $('#return_pickup_location_id').val();
						var return_pickup_date				= $('#return_pickup_date').val();
						var return_pickup_time				= $('#return_pickup_time').val();
						var dropoff_location				= $('#departure_dropoff_location_id option:selected').text();
						var departure_dropoff_date			= $('#departure_dropoff_date').val();
						var departure_dropoff_time			= $('#departure_dropoff_time').val();

						var departure_flight_no				= $('#departure_flight_no').val();
						var departure_flight_date			= $('#departure_flight_date').val();
						var departure_flight_time			= $('#departure_flight_time').val();

						var return_flight_no				= $('#return_flight_no').val();
						var return_flight_date				= $('#return_flight_date').val();
						var return_flight_time				= $('#return_flight_time').val();

						var transfer_user_id				= $('#transfer_user_id').val();

						var comment							= $('#comment').val();

						$.post(
							'/data/admin_data.php?action=Transfer_User::AJAX_ProcessPost',
							{
								transfer_user_id: 				transfer_user_id,
								departure_dropoff_location_id: 	departure_dropoff_location_id,
								return_pickup_location_id: 		return_pickup_location_id,
								return_pickup_date: 			return_pickup_date,
								return_pickup_time: 			return_pickup_time,
								departure_dropoff_date: 		departure_dropoff_date,
								departure_dropoff_time: 		departure_dropoff_time,
								departure_flight_no: 			departure_flight_no,
								departure_flight_date: 			departure_flight_date,
								departure_flight_time: 			departure_flight_time,
								return_flight_no: 				return_flight_no,
								return_flight_date: 			return_flight_date,
								return_flight_time: 			return_flight_time,
								comment: 						comment,
							},
							function(){
								$("#tu_col1_"+transfer_id).text(dropoff_location + ' - ' + departure_dropoff_date + ' ' + departure_dropoff_time);
								$("#tu_col2_"+transfer_id).text(departure_flight_no + ' - ' + departure_flight_date + ' ' + departure_flight_time);
								$("#tu_col3_"+transfer_id).text(return_flight_no + ' - ' + return_flight_date + ' ' + return_flight_time);
								$('#transfer_user_container').dialog('close');
								if (typeof refreshTransferUserTable == 'function') {
  									refreshTransferUserTable(user_id, transfer_id);
								}
							}
						)

					},
					'cancel':function(){
						$('#transfer_user_container').dialog('close');
					}
				}
			});
		}
	)
}

function updateEndTime(){
	var time			= $("#appointment_time_start").val();

	if(time && checkTime(time)){
		var new_time	= getAdjustedTime(time, 0, 60);
		$("#appointment_time_end").val(new_time);
	}
}

function checkTime(time){
	var re = /^(([0-1]?\d[0-9])|([2][0-3])):([0-5]?[0-9])(:([0-5]?[0-9]))?$/;
	return time.match(re);
}

function addFile(){
	$('#manual_file_table').append(
		$("<tr>")
			.append($("<td>")
			.append($("<input id='file_upload[]' name='file_upload[]'' type='file'/>"))
			.append($("<td>")))

			.append($("<td align='right'>")
			.append($("<span style='float:right;' class='ui-red-icon ui-icon-close pointer' onclick='removeFile(this);'></span>"))
			.append($("<td>")))
	);
}

function removeFile(target){
	$(target).parent().parent().remove();
	return false;
}

function toggleCBSS(section_id){
	var checked	= 'checked'==$('#' + section_id + ' input:first').attr('checked');
	if(checked){
		$('#' + section_id + ' input').attr('checked', true);
	}else{
		$('#' + section_id + ' input').removeAttr('checked');
	}
}
function editCurriculum(){
	createDiv('new_curriculum_diag');
	$("#new_curriculum_diag").load("/data/admin_data.php?action=Curriculum::AJAX_BuildCurriculumScreen", {}, function(){
		$("#new_curriculum_diag").dialog({
			modal:	true, resizable:false, position:"middle", title:"Edit Curriculum List", width:500,
			close:	function(){$("#new_curriculum_diag").dialog("destroy");},
			open:	function(){},
			buttons:{
				"update":function(){
					$.get("/data/admin_data.php?action=Curriculum::AJAX_AddCurriculum&"+$("#new_curriculum_diag input,#new_curriculum_diag select").serialize(), function(){
						$("#new_curriculum_diag").dialog("destroy");
						$("#curriculum_id").empty();
						$.getJSON("/data/admin_data.php?action=Curriculum::AJAX_GetCurriculumList", function(data){
							$('#curriculum_id')
									.append($("<option></option>")
									.attr("value","")
									.text(""));
							$.each(data, function(key, value) {
								$('#curriculum_id')
									.append($("<option></option>")
									.attr("value",key)
									.text(value));
							});
						});
					});
				},
				"cancel":function(){$("#new_curriculum_diag").dialog("close");}
			}
		});
	});
}

function addCurriculum(){
	$("#curriculum_container").append($("<input name='new_curriculum[]'>"));
}

function switchToParentUI(){
	wait_message.show();
	$('#body_form').append('<input name="_switch_user_mode" type="hidden" value="guardian"/>').submit();
}

function switchToStaffUI(){
	wait_message.show();
	$('#body_form').append('<input name="_switch_user_mode" type="hidden" value="staff"/>').submit();
}

function updateStudentSelection(){
	wait_message.show();
	var user_id	= $('#_switch_student').val();
	$('#body_form').append($('<input name="_switch_student" type="hidden"/>').val(user_id)).submit();
}

function buildReadOnlySecurityTree(user_id){
	$("#security_tree").dynatree({
		autoCollapse: true, selectMode: 3, checkbox: false, clickFolderMode:3, autoFocus:false, debugLevel:0, fx:{height:"toggle", duration:200},
		initAjax: {url:"/data/admin_data.php?action=User::AJAX_GetReadSecurityStructure",data:{user_id:user_id}}
	});
}

function removeCCExpiry(){
	$("#cc_expiry").val("");
}


function openAnnouncementModal(announcement_id, subject = ''){
	if (subject.length == 0) {
		subject = $(".announcement_" + announcement_id + " .title").html();
	}

	var print_translation = $("#print_translation").val();
	var mark_as_unread_translation = $("#mark_as_unread_translation").val();
	var close_translation = $("#close_translation").val();

	$(".announcement_" + announcement_id).addClass("read");
	$("#announcement_modal").remove();
	$("body").append('<div id="announcement_modal"></div>');
	$("#announcement_modal").load('/data/common_handler.php?action=Announcement::AJAX_U_GetAnnouncementDashboardView', {announcement_id:announcement_id}, function(){
		$("#announcement_modal .announcement_content a").each(function(){
			$(this).attr("target", "_blank");
		});
		var m_width = 700;
		if($(window).width() < 700){
			m_width = $(window).width();
		}
		var buttons = {};
		buttons[print_translation] = function(){
			window.open("/data/common_handler.php?action=Announcement::AJAX_U_PrintAnnouncement&announcement_id="+announcement_id);
			$("#announcement_modal").dialog('close');
		};

		buttons[mark_as_unread_translation] = function(){
			markAnnouncementAsUnRead(announcement_id);
			$("#announcement_modal").dialog('close');
		};

		buttons[close_translation] = function(){
			$("#announcement_modal").dialog('close');
		};

		$("#announcement_modal").dialog({modal:true,position:'top',width:m_width, title:subject, height:500,buttons:buttons});
	});

}

function markAnnouncementAsUnRead(announcement_id){
	$.post("/data/common_handler.php?action=Announcement::AJAX_U_UpdateReadStatus", {announcement_id:announcement_id,status:0});
	$(".announcement_" + announcement_id).removeClass("read");
}

$.fn.serializeObject = function()
{
	var o = {};
	var a = this.serializeArray();
	$.each(a, function() {
		if (o[this.name] !== undefined) {
			if (!o[this.name].push) {
				o[this.name] = [o[this.name]];
			}
			o[this.name].push(this.value || '');
		} else {
			o[this.name] = this.value || '';
		}
	});
	return o;
};

function printParentPTAppointments(){
	alert();
}

function toggleMultiselect(){
	var is_checked = $('#multi_field_toggle').prop('checked');
	$('#multi_field_select input').attr('checked', is_checked);
}

function buildMultiSelectDialog(field_name, value_options){
	createDiv('multi_select_diag');
	var param	= {value_options:value_options,values:[]};
	$('#'+escapeSB(field_name)+'_container input').each(function(i, field){
		param.values.push($(field).val());
	});

	$('#multi_select_diag').load('/data/anonymous_handler.php?action=Field::AJAX_A_BuildMultiDialog', param, function(){
		$('#multi_select_diag').dialog({modal:true,position:'top', title:'Options', buttons:{
			'update':function(){
				$('#'+escapeSB(field_name)+'_container').html('');
				$('#multi_field_select input:checked').each(function(i, field){
					$('#'+escapeSB(field_name)+'_container').append(
						$('<div/>')
							.html($(field).attr('alt'))
							.append($('<input type="hidden">').attr('name', field_name+'[]').val($(field).val()))
					);
				});
                $('#'+escapeSB(field_name)+'_container').trigger("change");
                applyNiceScroll($('#'+escapeSB(field_name)+'_container'));
				if($('#multi_field_select input:checked').length == 0){
					var placeholder = $('<div/>')
						.html($('#'+escapeSB(field_name)+'_container').attr("placeholder"));
					placeholder.addClass("placeholder");
					$('#'+escapeSB(field_name)+'_container').append(
						placeholder
					);
				}
				$('#multi_select_diag').dialog('close');
			},
			'cancel':function(){
				$('#multi_select_diag').dialog('close');
			}
		}});
	});
}

function downloadAssessmentStudentGradeReportByAssessmentReportID(session_id, user_id, language_code, report_type_id, assessment_report_id){
	openContent("/data/admin_data.php?action=Assessment_Grade_Report_PDF::AJAX_DownloadPreview&session_id=" + session_id + "&user_id[]=" + user_id + "&language_code="+language_code + "&report_type_id="+report_type_id+"&assessment_report_id="+assessment_report_id, true);
}

function downloadAssessmentStudentGradeReport(session_id, user_id, language_code, report_type_id){
	openContent("/data/admin_data.php?action=Assessment_Grade_Report_PDF::AJAX_DownloadPreview&session_id=" + session_id + "&user_id[]=" + user_id + "&language_code="+language_code + "&report_type_id="+report_type_id, true);
}

function downloadStudentGradeReport(session_id, user_id, language_id, report_type_id){
	openContent("/data/admin_data.php?action=Grade_Report_PDF::AJAX_DownloadPreview&session_id=" + session_id + "&user_id[]=" + user_id + "&language_id="+language_id + "&report_type_id="+report_type_id, true);
}

function loadDonor(donor_id){
	openContent("/content/donor/donor_edit.php?user_id="+donor_id);
}

function loadCourseDiary(course_diary_id){
	openContent("/content/course_diary/course_diary_edit.php?course_diary_id="+course_diary_id);
}

function requestModification(request_type, id){
	openContent('/content/change_request/change_request.php?request_type='+request_type+'&id='+id);
}

function fetchRequestClassData(){
	var request_class_id = $('#request_class_id').val();
	$.getJSON(
		'/data/admin_data.php?action=Klass::AJAX_GetClass',
		{class_id:request_class_id},
		function(klass){
			$('#request_class_date_start')
				.val(klass.local_date_start)
				.attr('min_value', SQLToLocalDate(klass.year.date_start))
				.attr('max_value', SQLToLocalDate(klass.year.date_end))
				;

			$('#request_class_date_end')
				.val(klass.local_date_end)
				.attr('min_value', SQLToLocalDate(klass.year.date_start))
				.attr('max_value', SQLToLocalDate(klass.year.date_end))
				;
		}
	);
}

function evalChangeRequestUI(){
	var change_request_type_id = $('#change_request_type_id input:checked').val();
	if("2"==change_request_type_id){
		$('.staff_change_request').show();
		$('.relationship_change_request').hide();
	} else if("3"==change_request_type_id){
		$('.staff_change_request').hide();
		$('.relationship_change_request').show();
	}
}

function initiateChangeRequest(user_id, change_request_type_id, target_entity_id){
	wait_message.show();
	createDiv('change_request');
	$('#change_request').load(
		'/data/admin_data.php?action=Change_Request::AJAX_BuildChangeRequestScreen',
		{user_id:user_id,change_request_type_id:change_request_type_id, target_entity_id:target_entity_id},
		function(){
			$('#change_request input').focus();
			wait_message.hide();
			evalChangeRequestUI();
			$('#change_request_type_id').buttonset();
			$('#change_request').slideOver({
				title:'Access Request',
				buttons:{
					'Request':function(){
						var form_data = $('#change_request_form').serialize();
						wait_message.show();
						$.post(
							'/data/admin_data.php?action=Change_Request::AJAX_ProcessChangeRequest',
							form_data,
							function(data){
								wait_message.hide();
								if(data.errors.length>0){

									alert('The following validation error(s) have encountered:\n\n' + data.errors.join('\n') + '\n\nCorrect the listed error(s) before submitting the data again');
								} else {
									$('#change_request').slideOver('close');
								}
							},
							'json'
						);
					},'Cancel':function(){
						$('#change_request').slideOver('close');
					}
				}
			});
		}
	)
}

function Initials(cString) {
	return cString.replace(/\W*(\w)\w*/g, '$1').toUpperCase()
}

function evalMedicalEventUI(){
	var type_id	 = $("#medical_event_type_id").val();
	$(".medical_event_measure").hide();
	switch(type_id){
		case "1": 		//Measurement
			$(".medical_event_measure").show();
			break;
		case "2": 		//Non-prescriptive treatment
			break;
		case "3": 		//Prescriptive treatment
			break;
		case "4": 		//School clinic visit
			break;
		case "5": 		//Immunisation
			break;
		case "6": 		//Medical condition
			break;
		case "7": 		//Allergy - Food
			break;
		case "8": 		//Allergy - Medical
			break;
		case "9": 		//Allergy - Environmental
			break;
	}

	// if("1"==type_id){
	// 	$(".medical_event_description").hide();

	// 	$("#medical_event_description").val("");
	// }else{
	// 	$(".medical_event_description").show();
	// 	$(".medical_event_measure").hide();
	// }
}

var new_field_index = 0;
function addMedicalEventBox(){
	var category_id	= $('#category_id').val();
	$('#medical_event_type_container').dialog('close');
	$('#medical_event_table tbody .no_data').remove();
	$.get(
		'/data/admin_data.php?action=Medical_Record::AJAX_BuildMedicalEvent',
		{category_id:category_id, new_field_index:new_field_index},
		function(data){
			var $row	= $(data);
			var $table	= $row.hasClass('is_event') ? $('#medical_event_table') : $('#medical_record_table');
			var is_odd	= 0==($("tbody tr", $table).size() % 2) ? true : false;
			$table.prepend($(data).css('background-color', is_odd ? '#efefef' : 'transparent'));
			$(".autoexpand").TextAreaExpander(17);
			makeZebra('#' + $table.attr('id'));
		}
	);
	new_field_index		+= 1;
}

function addMedicalRecord(){
	createDiv("medical_event_type_container");

	$('#medical_event_type_container').load('/data/admin_data.php?action=Medical_Record::AJAX_DisplayEventTypeList', function(){
		$('#medical_event_type_container').dialog({modal:true,position:'top', height:550, width: 340, buttons:{
			'confirm':function(){
				var category_id		= $('#category_id').val();
				var error_msg		= "";

				error_msg			= null==category_id		? " - No category selected\n" : "";

				if(""!=error_msg){
					alert("The following error(s) have occurred\n\n"+error_msg+"\n");
				}else{
					addMedicalEventBox();
				}
			},
			'cancel':function(){
				$('#medical_event_type_container').dialog('close');
			},
		}});
	});
}

function removeMedicalRecord(medical_record_id){
	if(confirm("Are you sure you want to delete this medical record?")){
		$("#new_medical_record_"+medical_record_id).remove();
		if(medical_record_id){
			$("#student_form").append($("<input name='delete_medical_entry[]' type='hidden'>").val(medical_record_id));
		}
	}
}

function displayMultiClassSelect(source, field_name, role_id, multi_school){
	createDiv('multi_class_container');
	var param					= {};
	param.role_id				= role_id;
	param.multi_school			= multi_school;
	param.class_id_list			= [];

	$(source).find('input').each(function(i, field){
		param.class_id_list.push($(field).val());
	});

	$('#multi_class_container')
	 	.load('/data/admin_data.php?action=Field::AJAX_BuildMultiClassSelectDialog', param, function(){
	 		$(this).dialog({
	 			modal:true, position:'top', width:500, title:'Class list', resizable:false,
	 			buttons:{
	 				'confirm':function(){
	 					$(source).html("");
	 					$('#dlg_avalailable_class_id_list option:checked').each(function(i, field){
							$(source).append(
								$('<div>')
									.text($(field).text())
									.append(
										$('<input type="hidden">')
											.attr('name', field_name+'[]')
											.val($(field).val())
									)
							);
	 					});
                        applyNiceScroll($("#mock_class"));
 						$('#multi_class_container').dialog('close');
	 				},
					'cancel':function(){
						$('#multi_class_container').dialog('close');
					}
	 			}
	 		});
	 	});
}

function displayMultiTermSelect(source, field_name){
	createDiv('multi_term_container');
	var param					= {};
	param.term_id_list	= [];

	$(source).find('input').each(function(i, field){
		param.term_id_list.push($(field).val());
	});

	$('#multi_term_container')
		.load('/data/admin_data.php?action=Field::AJAX_BuildMultiTermSelectDialog', param, function(){
			$(this).dialog({
				modal:true, position:'top', width:500,height:500, title:'Term list', resizable:false,
				buttons:{
					'confirm':function(){
						$(source).html("");
						$('#dlg_avalailable_term_id input:checked').each(function(i, field){
							if ($(field).next().length) {
								$(source).append(
									$('<div>')
										.text($(field).next().html())
										.append(
											$('<input type="hidden">')
												.attr('name', field_name+'[]')
												.val($(field).val())
										)
								);
							}
						});
						$('#multi_term_container').dialog('close');
						applyNiceScroll($("#mock_term_list"));
					},
					'cancel':function(){
						$('#multi_term_container').dialog('close');
					}
				}
			});
		});
}

function displayMultiClassLevelSelect(source, field_name, role_id, multi_school){
	createDiv('multi_class_level_container');
	var param					= {};
	param.role_id				= role_id;
	param.multi_school			= multi_school;
	param.class_level_id_list	= [];

	$(source).find('input').each(function(i, field){
		param.class_level_id_list.push($(field).val());
	});

	$('#multi_class_level_container')
		.load('/data/admin_data.php?action=Field::AJAX_BuildMultiClassLevelSelectDialog', param, function(){
			$(this).dialog({
				modal:true, position:'top', width:500,height:500, title:'Class level list', resizable:false,
				buttons:{
					'confirm':function(){
						$(source).html("");
						$('#dlg_avalailable_class_level_id input:checked').each(function(i, field){
							if ($(field).next().length) {
								$(source).append(
									$('<div>')
										.text($(field).next().html())
										.append(
											$('<input type="hidden">')
												.attr('name', field_name+'[]')
												.val($(field).val())
										)
								);
							}
						});
						$('#multi_class_level_container').dialog('close');
                        applyNiceScroll($("#mock_class_level_list"));
					},
					'cancel':function(){
						$('#multi_class_level_container').dialog('close');
					}
				}
			});
		});
}

function displayMultiSchoolLevelSelect(source, field_name, role_id){
	createDiv('multi_school_level_container');
	var param					= {};
	param.role_id				= role_id;
	param.school_level_id_list	= [];

	$(source).find('input').each(function(i, field){
		param.school_level_id_list.push($(field).val());
	});

	$('#multi_school_level_container')
		.load('/data/admin_data.php?action=Field::AJAX_BuildMultiSchoolLevelSelectDialog', param, function(){
			$(this).dialog({
				modal:true, position:'top', width:500, title:'School level list', resizable:false,
				buttons:{
					'confirm':function(){
						$(source).html("");
						$('#dlg_avalailable_school_level_id option:checked').each(function(i, field){
							$(source).append(
								$('<div>')
									.text($(field).text())
									.append(
										$('<input type="hidden">')
											.attr('name', field_name+'[]')
											.val($(field).val())
									)
							);
						});
						$('#multi_school_level_container').dialog('close');
                        applyNiceScroll($("#mock_school_level_list"));
					},
					'cancel':function(){
						$('#multi_school_level_container').dialog('close');
					}
				}
			});
		});
}

function makeZebra(target_reference){
	var count	= 0;
	$(target_reference).find('tbody tr').each(function(i, row){
		if((count%2)==0){
			$(row).find('td').css('background-color', 'transparent');
		}else{
			$(row).find('td').css('background-color', '#efefef');
		}
		count	+= 1;
	});
}

function loadResizedPortrait($img, url, w, h){
	$.ajax({
		url: '/content/system/resize.php',
    	data: {
    		url: url,
    		w: w,
    		h: h,
    	},
    	success: function(data) {
	    	var $loader = $(document.createElement('img'));
		    $loader.one('load', function() {
		        $img.attr('src', $loader.attr('src'));
		    });
		    $loader.attr('src', data);
		    if($loader.complete) {
		        $loader.trigger('load');
		    }
	    },
	    error: function( jqXHR, textStatus, errorThrown ) {
			console.log("Error resizing image from S3");
	    }
	});
}


function setAllToHeader(field_name, option_name){
	$("."+field_name).each(function(i,select){
		$(select).val(option_name);
	});
	$(".ui-tooltip").hide();
}

function openIEP(iep_id){
	openContent("/content/iep/iep_edit.php?iep_id="+iep_id);
}

function readIEP(iep_id){
	openContent("/content/iep/iep_read.php?iep_id="+iep_id);
}

$(document).mouseup(function (e)
{

	if($("body").hasClass("menu-toggle")){
	    var container = $("#interface_navigator");

	    if (!container.is(e.target) // if the target of the click isn't the container...
	        && container.has(e.target).length === 0) // ... nor a descendant of the container
	    {
	        $("body").removeClass("menu-toggle");
	    }
	}
});

function fetchAttendanceDetails(user_id, date){
	createDiv('attendance_container');
	$('#attendance_container').load(
		'/data/common_handler.php?action=User_Attendance::AJAX_U_GetStudentAbsenceDetails',
		{user_id:user_id, date:date},
		function(){
			$('#attendance_container').dialog(
				{
					modal:true, title:'Attendance details', 'width':500,
					buttons:{
						'close':function(){
							$('#attendance_container').dialog('close');
						}
					}
				}
			);
		}
	);
}

function createFeedback(){
	createDiv("feedback");
	$("#feedback").load(
		'/data/common_handler.php?action=Suggestion::AJAX_U_Create',
		{},
		function(){
			$('.buttonset').buttonset();
			$("#feedback").dialog({
				modal:true,width:366,title:"New Feedback",position:'top',
				buttons:{
					'submit':function(){
						$.post(
							'/data/common_handler.php?action=Suggestion::AJAX_U_ProcessSubmission',
							{
								suggestion_type_id:$('#suggestion_type_id input:checked').val(),
								suggestion_category_id:$('#suggestion_category_id').val(),
								suggestion:$('#suggestion').val()
							},
							function(data){
								if(data.errors.length>0){
									alert("The system returned the following validation error(s):\n\n"+data.errors.join('\n') + "\n\nCorrect them before submitting them again");
								}else{
									alert(data.success);
									$("#feedback").dialog("close");
								}

							},
							"json"
						)
					},
					'cancel':function(){
						$("#feedback").dialog("close");
					}
				}
			});
		}
	);
}

function viewStudentFTECount(user_id){
	createDiv('fte_count_container');
	$('#fte_count_container').load(
		'/data/admin_data.php?action=BC_Student::AJAX_ViewFTESummary',
		{user_id:user_id},
		function(){
			$('#fte_count_container')
				.dialog({
					modal:true, width:500, title:"FTE Summary",	position:"top",
					buttons:{
						'close':function(){$('#fte_count_container').dialog('close');}
					}
				});
		}
	)
}

function hideSuggestionWarning(){
	$('.suggestion_form_field').show();
	$('.warning_message').hide();
	setCookie('acknowledges_suggestion_warning', 1);
}

function applyToWorkflow(application_workflow_id){
	openContent('/content/apply/edit_my_application.php?application_workflow_id='+application_workflow_id);
}

function createStudentForWorkflow(application_workflow_id){
	openContent('/content/apply/create_student.php?application_workflow_id='+application_workflow_id);
}

function openFlow(flow_id){
    openContent('/content/apply/edit_my_application.php?flow_id='+flow_id);
}

function openFlowStep(flow_step_id, flow_id){
	if(0==flow_step_id){
		openFlow(flow_id);
	}else{
		openContent('/content/apply/edit_application_form.php?flow_step_id='+flow_step_id);
	}
}

function reapplyToFlow(flow_id){
	wait_message.show();
	$.getJSON('/data/common_handler.php?action=Flow::AJAX_U_Reapply', {flow_id:flow_id}, function(new_flow_id){
		openFlow(new_flow_id);
	});
}

$.fn.extend({
	insertAtCaret: function(myValue){
		var obj;
  		obj = (typeof this[0].name !='undefined') ? this[0] : this;

  		if ($.browser.msie) {
    		obj.focus();
    		sel = document.selection.createRange();
    		sel.text = myValue;
    		obj.focus();
    	} else if ($.browser.mozilla || $.browser.webkit) {
    		var startPos = obj.selectionStart;
    		var endPos = obj.selectionEnd;
    		var scrollTop = obj.scrollTop;
    		obj.value = obj.value.substring(0, startPos)+myValue+obj.value.substring(endPos,obj.value.length);
    		obj.focus();
    		obj.selectionStart = startPos + myValue.length;
    		obj.selectionEnd = startPos + myValue.length;
    		obj.scrollTop = scrollTop;
  		} else {
    		obj.value += myValue;
    		obj.focus();
   		}

		if(typeof tinyMCE !== 'undefined') {
			tinyMCE.activeEditor.setContent(obj.value);
		}
 	}
});

function openCensusSubmission(form_id){
	openContent('/content/census/census_submission.php?form_id='+form_id);
}

function initSlideoverSelect(elementName, title) {
    $("#mock_" + elementName).click(function () {
        if(!$("#mock_" + elementName).hasClass('disabled')){
            createDiv('slideover_select_content');
            var data = $("#" + elementName).data('data');
            var tree = $("<ul></ul>");

            var currentValues = $("#" + elementName).val().split(',');

            $.each(data, function( index, element ) {
                var listItem = $("<li></li>").addClass("selectable").data('value', element.id);
/*                if(data.length > 1){
                    var checkbox = $("<input type='checkbox' name='slideoverValues' value='" + element.id + "' />");
                    if(currentValues.indexOf(element.id) >= 0){
                        checkbox.prop('checked', true);
                    }
                    listItem.append(checkbox);
                }*/
                listItem.append("<span>" + element.label + "</span>");
                tree.append(listItem);
            });

            var container = $("<div></div>").addClass("slideover-list");
            container.append(tree);
            $('#slideover_select_content').html('');
            $('#slideover_select_content').append(container);

            $("#slideover_select_content .selectable input:checkbox").click(function(e){
                e.stopPropagation();
            });

            $(" #slideover_select_content .selectable").click(function(e){
                $("#" + elementName).val($(this).data('value'));
                $("#mock_" + elementName).html($(this).find('span').html());
                $('#slideover_select_content').slideOver('close');
                $("#" + elementName).trigger('change');
                $("#mock_" + elementName).removeClass('unset');
            });

            $('#slideover_select_content').slideOver({
                title: title,
                buttons: {
                    'select': function () {
                        var values = $("#slideover_select_content .selectable input:checkbox:checked").map(function(){
                            return $(this).val();
                        });
                        if(values.length == 0){
                            $("#mock_" + elementName).addClass('unset');
                        }else{
                            $("#mock_" + elementName).removeClass('unset');
                            $("#" + elementName).val($.makeArray(values).join(','));
                            var labels = $("#slideover_select_content .selectable input:checkbox:checked").map(function(){
                                return $(this).next().html();
                            });
                            $("#mock_" + elementName).html($.makeArray(labels).join(', '));
                        }
                        $("#" + elementName).trigger('change');
                        $('#slideover_select_content').slideOver('close');
                    },
                    'cancel': function () {
                        $('#slideover_select_content').slideOver('close');
                    }
                }
            });
        }
    });
}

function initSlideoverSelect2(element, title) {
    element.hide();
	var mockElement = $("<div class='form-control clickable'></div>");
	var selectedOption = element.find(":selected");
	if(selectedOption.val() != 0 && selectedOption.val() != ""){
		var selectedOptGroup = selectedOption.parent();
		mockElement.text(selectedOptGroup.attr('label') + " > " + selectedOption.text());
	}else{
		mockElement.text("Select");
	}
    element.change(function(){
        var selectedOption = $(this).find(":selected");
        if(selectedOption.val() != 0 && selectedOption.val() != ""){
            var selectedOptGroup = selectedOption.parent();
            mockElement.text(selectedOptGroup.attr('label') + " > " + selectedOption.text());
        }else{
            mockElement.text("Select");
        }
	});
	mockElement.click(function(){
        var selector = $("<div class='slideover-select-multilevel'></div>");
        var list = $("<ul></ul>");
        element.find("optgroup").each(function(){
        	var groupElement = $("<li><span>" + $(this).attr('label') + "</span></li>");
            groupElement.click(function(){
            	if($(this).hasClass("active")){
                    $(this).removeClass("active");
                }else{
                    list.find("li").removeClass("active");
                    $(this).addClass("active");
				}
			});
        	var subList = $("<ul></ul>");
            $(this).find("option").each(function(){
            	var childElement = $("<li><span>" + $(this).text() + "</span></li>");
            	childElement.data("id", ($(this).val()));
            	childElement.click(function(){
            		var value = $(this).data("id");
                    element.val(value);
                    element.trigger("change");
                    selector.slideOver('close');
				});
                subList.append(childElement);
            });
            groupElement.append(subList);
        	list.append(groupElement);
		});
        selector.append(list);
        selector.slideOver({
            title:title,
            buttons:{
                'cancel':function(){selector.slideOver('close');}
            }
        });
	});
	element.after(mockElement);
}

function displayMyCourseClassPicker(field_name){
    var entity_type_field = $("#" + field_name + '_type');
    var entity_id_field = $("#" + field_name + '_id');
    var mock_field = $("#mock_" + field_name);
    var target_date = $('#attendance_date').val();

    createDiv('my_course_class_slideover');
    wait_message.show();
    $('#my_course_class_slideover').load(
        '/data/admin_data.php?action=Contact::AJAX_BuildMyAttendanceCourseClassSlideOver',
        {target_date:target_date},
        function(){
            $("#my_course_class_slideover li.selectable").click(function(){
                entity_type_field.val($(this).data('entity-type'));
                entity_id_field.val($(this).data('entity-id'));
                mock_field.html($(this).html());
                mock_field.removeClass('unset');
                entity_id_field.trigger("change");
                $('#my_course_class_slideover').slideOver('close');
            });
            wait_message.hide();
            $('#my_course_class_slideover').slideOver({
                title:'Course(s) / Class(es)',
                buttons:{
                    'cancel':function(){$('#my_course_class_slideover').slideOver('close');}
                }
            });
        });
}
function  applyNiceScroll(selector){
    setTimeout(function(){
    	$(selector).niceScroll({horizrailenabled:false});
    	}, 100);
}

function buildUploadFiles(){
	$('.myschool_file').each(function(i, input){
		if(undefined==$(input).attr('processed')){
			var field_name = $(input).attr('name');
			var mock_input = $("<input type='hidden'/>").attr('name', field_name);
			$(input).after(mock_input);
			$(input).change(function(){
				$(input).addClass('ui-autocomplete-loading');
				var xhr = new XMLHttpRequest();
				xhr.open("POST", '/data/common_handler.php?action=File::AJAX_U_ProcessFile', true);
				xhr.onreadystatechange = function() {
					if (xhr.readyState == 4 && xhr.status == 200) {
						var jsonResponse = JSON.parse(xhr.responseText);
						$(mock_input).remove();
						$(input)
							.parent()
							.append(jsonResponse.link)
							.append($("<input type='hidden'/>").val(jsonResponse.file_id).attr('name', field_name))
							;
						$(input).remove();
					}
				};

				var fd = new FormData();
				fd.append("upload_file", $(input)[0].files[0]);
				xhr.send(fd);
			});
			$(input).attr('processed', true);
		}
	});
}

function setScaleField(field_id, value){
	$('#'+escapeSB(field_id)).val(value);
	$('#'+escapeSB(field_id)).change();
    $('#changed_'+escapeSB(field_id)).val(1);
	$('#'+escapeSB(field_id)+"_container .scale_option").css('opacity', 0.3);
	$('#'+escapeSB(field_id)+"_container .scale_option[value='" + value + "']").css('opacity', 1);
}

function createSchoolSelectCombo(){
	$.widget("custom.combobox", {
		_create: function () {
			this.wrapper = $("<span>")
				.addClass("custom-combobox")
				.insertAfter(this.element);

			select = this.element.hide();
			this._createAutocomplete();
			this._createShowAllButton();
		},

		_createAutocomplete: function () {
			var selected = this.element.children(":selected"),
				value = selected.val() ? selected.text() : "";

			this.input = $("<input>")
				.appendTo(this.wrapper)
				.val(value)
				.attr("title", "")
				.addClass("custom-combobox-input ui-widget ui-widget-content ui-state-default ui-corner-left")
				.autocomplete({
					delay: 0,
					minLength: 0,
					source: $.proxy(this, "_source")
				})
				.click(function(){$(this).select();})
			;

			this.input.bind('autocompleteselect', function (event, ui) {
				ui.item.option.selected = true;
				$(this).trigger("select", event, {
					item: ui.item.option
				});
			});

			this.input.bind('autocompletechange', function (event, ui) {

				// Selected an item, nothing to do
				if (ui.item) {
					return;
				}

				// Search for a match (case-insensitive)
				var value = this.input.val(),
					valueLowerCase = value.toLowerCase(),
					valid = false;
				this.element.children("option").each(function () {
					if ($(this).text().toLowerCase() === valueLowerCase) {
						this.selected = valid = true;
						return false;
					}
				});

				// Found a match, nothing to do
				if (valid) {
					return;
				}

				// Remove invalid value
				this.input.val("")
					.attr("title", value + " didn't match any item")
				/*.tooltip("open")*/;
				this.element.val("");
				this._delay(function () {
					this.input /*.tooltip("close")*/
						.attr("title", "");
				}, 2500);
				this.input.data("ui-autocomplete").term = "";
			});
		},

		_createShowAllButton: function () {
			var input = this.input,
				wasOpen = false;

			$("<a>")
				.attr("tabIndex", -1)
				.attr("title", "Show All Items")
				//.tooltip()
				.appendTo(this.wrapper)
				.button({
					icons: {
						primary: "ui-icon-triangle-1-s"
					},
					text: false
				})
				.removeClass("ui-corner-all")
				.addClass("custom-combobox-toggle ui-corner-right")
				.mousedown(function () {
					wasOpen = input.autocomplete("widget").is(":visible");
				})
				.click(function () {
					input.focus();

					// Close if already visible
					if (wasOpen) {
						return;
					}

					// Pass empty string as value to search for, displaying all results
					input.autocomplete("search", "");
				});
		},

		_source: function (request, response) {
			var matcher = new RegExp($.ui.autocomplete.escapeRegex(request.term), "i");
			response(this.element.children("option").map(function () {
				var text = $(this).text();
				if (this.value && (!request.term || matcher.test(text))) return {
					label: text,
					value: text,
					option: this
				};
			}));
		},

		_destroy: function () {
			this.wrapper.remove();
			this.element.show();
		}
	});

	$( "#switch_school_id" ).combobox();
	$( "#toggle" ).on( "click", function() {
		$( "#switch_school_id" ).toggle();
	});
}

function buildSelectComboBox(){
	$.widget("custom.catcomplete", $.ui.autocomplete, {
		_create: function () {
			$.extend($.ui.menu.prototype.options, {
				items: "> :not(.ui-autocomplete-category)"
			});

			this.wrapper = $("<span>")
				.addClass("custom-combobox")
				.insertAfter(this.element);

			this.element.hide();
			this._createAutocomplete();
			this._createShowAllButton();
		},
		_createAutocomplete: function () {
			var select = this.element.hide();
			var selected = this.element.find(":selected"),
				value = selected.val() ? selected.text() : "";

			this.input = $("<input>")
				.appendTo(this.wrapper)
				.val(value)
				.attr("title", "")
				.addClass("custom-combobox-input ui-widget ui-widget-content ui-state-default ui-corner-left")
				.autocomplete({
					delay: 0,
					minLength: 0,
					source: $.proxy(this, "_source"),
					select: function( event, ui ) {
						ui.item.option.selected = true;
						select.trigger("change");
					}
				})
				.click(function(){$(this).select();});

			this.element.change(function(){
				var selected = $(this).find(":selected"),
				value = selected.val() ? selected.text() : "";

				var span = $(this).next();

				$(span).children('input').each(function () {
					$(this).val(value);
				});
			});

			this.input.data("autocomplete")._renderMenu = function(ul, items) {
				var self = this,
					currentCategory = "";
				$.each(items, function(index, item) {
					if (item.category !== currentCategory) {
						if (item.category) {
							ul.append("<li class='ui-autocomplete-category'>" + item.label + "</li>");
						} else {
							self._renderItem(ul, item);
						}
						currentCategory = item.category;
					} else {
						self._renderItem(ul, item);
					}
				});
			};

			this.element.parent().find('.custom-combobox-input').val(value);

			this.input.bind('autocompleteselect', function (event, ui) {
				ui.item.option.selected = true;
				$(this).trigger("select", event, {
					item: ui.item.option
				});
			});
		},

		_createShowAllButton: function () {
			var input = this.input,
				wasOpen = false;

			$("<a>")
				.attr("tabIndex", -1)
				.attr("title", "Show All Items")
				//.tooltip()
				.appendTo(this.wrapper)
				.button({
					icons: {
						primary: "ui-icon-triangle-1-s"
					},
					text: false
				})
				.removeClass("ui-corner-all")
				.addClass("custom-combobox-toggle ui-corner-right")
				.mousedown(function () {
					wasOpen = input.autocomplete("widget").is(":visible");
				})
				.click(function () {
					input.focus();

					// Close if already visible
					if (wasOpen) {
						return;
					}

					// Pass empty string as value to search for, displaying all results
					input.autocomplete("search", "");
				});
		},

		_source: function (request, response) {
			var matcher = new RegExp($.ui.autocomplete.escapeRegex(request.term), "i");
			// Check if select has groups
			var data = [];
			if (this.element.children('optgroup').length) {
				data.push(this.element.children("optgroup").map(function () {
					data.push({
						category: $(this).attr('label'),
						label: $(this).attr('label'),
						value: $(this).attr('label'),
						option: this
					});
					$(this).children("option").map(function () {
						var text = $(this).text();
						if (this.value && (!request.term || matcher.test(text))) {
							data.push({
								label: text,
								value: text,
								option: this
							});
						}
					});
				}));
			} else {
				this.element.children("option").map(function () {
					var text = $(this).text();
					if (this.value && (!request.term || matcher.test(text))) {
						data.push({
							label: text,
							value: text,
							option: this
						});
					}
				});
			}
			response(data);
		},

		_destroy: function () {
			this.wrapper.remove();
			this.element.show();
		}
	});

	$( "select[enable-combo-box=true]" ).catcomplete();
}

function displayURL(path){
	createDiv('public_path_container');
	$('#public_path_container').html('');
	$('#public_path_container').append($('<textarea style="border-width:0">').val(path));
	$('#public_path_container').dialog({
		modal:true,position:'top',title:'URL',width:600,
		buttons:{
			'copy to clipboard':function(){
				$('#public_path_container textarea').select();
				document.execCommand('copy');
			},
			'cancel':function(){
				$('#public_path_container').dialog('close');
			}
		}
	});
}

function displayStudentProfileAssesmentSlideOver(course_id, session_id, user_id){

    createDiv('assessment_slide_over');
    wait_message.show();
    $('#assessment_slide_over').load(
        '/data/admin_data.php?action=NavStudentTab::AJAX_BuildViewAssessmentScreen',
        {
        	course_id:course_id,
			session_id: session_id,
			user_id: user_id
		},
        function(){
            $('.only-print').hide();
        	wait_message.hide();
            $('#assessment_slide_over').slideOver({
                buttons:{
                    'print':function(){
            			$('.only-print').show();
                    	$('#assessment_slide_over').print();
            			$('.only-print').hide();
					},
                    'close':function(){
                    	$('#assessment_slide_over').slideOver('close');
                    }
                }
            });
        });
}
/*
 * Returns 1 if the IBAN is valid
 * Returns FALSE if the IBAN's length is not as should be (for CY the IBAN Should be 28 chars long starting with CY )
 * Returns any other number (checksum) when the IBAN is invalid (check digits do not match)
 */
function isValidIBANNumber(input) {
	var CODE_LENGTHS = {
		AD: 24, AE: 23, AT: 20, AZ: 28, BA: 20, BE: 16, BG: 22, BH: 22, BR: 29,
		CH: 21, CR: 21, CY: 28, CZ: 24, DE: 22, DK: 18, DO: 28, EE: 20, ES: 24,
		FI: 18, FO: 18, FR: 27, GB: 22, GI: 23, GL: 18, GR: 27, GT: 28, HR: 21,
		HU: 28, IE: 22, IL: 23, IS: 26, IT: 27, JO: 30, KW: 30, KZ: 20, LB: 28,
		LI: 21, LT: 20, LU: 20, LV: 21, MC: 27, MD: 24, ME: 22, MK: 19, MR: 27,
		MT: 31, MU: 30, NL: 18, NO: 15, PK: 24, PL: 28, PS: 29, PT: 25, QA: 29,
		RO: 24, RS: 22, SA: 24, SE: 24, SI: 19, SK: 24, SM: 27, TN: 24, TR: 26
	};
	var iban = String(input).toUpperCase().replace(/[^A-Z0-9]/g, ''), // keep only alphanumeric characters
		code = iban.match(/^([A-Z]{2})(\d{2})([A-Z\d]+)$/), // match and capture (1) the country code, (2) the check digits, and (3) the rest
		digits;
	// check syntax and length
	if (!code || iban.length !== CODE_LENGTHS[code[1]]) {
		return false;
	}
	// rearrange country code and check digits, and convert chars to ints
	digits = (code[3] + code[1] + code[2]).replace(/[A-Z]/g, function (letter) {
		return letter.charCodeAt(0) - 55;
	});
	// final check
	return mod97(digits);
}
function mod97(string) {
	var checksum = string.slice(0, 2), fragment;
	for (var offset = 2; offset < string.length; offset += 7) {
		fragment = String(checksum) + string.substring(offset, offset + 7);
		checksum = parseInt(fragment, 10) % 97;
	}
	return checksum;
}
function editRelationshipTypes(){
	createDiv('edit_modal');
	$('#edit_modal').load('/data/admin_data.php?action=Relationship_Type::AJAX_GetManagementForm', {}, function(){
		var buttons = {};
		buttons.save = function(){
			var error = false;

			$('.relationship_type_label').each(function(i, relationship_type_label_field){
				if($(relationship_type_label_field).val() == ""){
					error = 'Name cannot be blank';
					$(relationship_type_label_field).addClass('error');
				}else{
					$(relationship_type_label_field).removeClass('error');
				}
			});

			if(error){
				alert(error);
			}else{
				var data = $('#edit_modal form').serialize();
				wait_message.show();
				$.post(
					'/data/admin_data.php?action=Relationship_Type::AJAX_SaveManagementForm', data,
					function(){
						$('#edit_modal').dialog('close');
						wait_message.hide();
						location.reload();
					}
				);
			}
		};

		buttons.cancel = function(){
			$('#edit_modal').slideOver('close');
		};

		buttons.add = function(){
			var rand_no = 1 + Math.floor(Math.random() * 9000);
			$('#relationships_types_table tr:last').clone().hide().val("").appendTo($('#relationships_types_table')).show('slow').find("input").attr('class', "relationship_type_label");
			$('#relationships_types_table tr:last').find("input[type='checkbox']").attr('class', "");
			$('#relationships_types_table tr:last input').each(function(i, field){
				var id_string = $(field).attr('id').slice(0,-2);
				id_string = id_string+"["+rand_no+"]";
				$(field).attr('id',id_string);
				$(field).attr('name',id_string);
			});
		};

		$('#edit_modal').slideOver({title:'Relationship Type Management', buttons:buttons});
	});
}

function addRelationshipType(){

}

function switchStudentLanguage(source){
	var language_code = $(source).val();
	wait_message.show();
	$.post(
		'/data/common_handler.php?action=Contact::AJAX_U_SetLocalLanguageCode', {language_code:language_code},
		function(){
			$('#body_form').append($('<input name="_switch_language" type="hidden"/>').val(language_code)).submit();
			wait_message.hide();

		}
	);
}
