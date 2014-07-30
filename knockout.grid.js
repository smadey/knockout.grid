define(function(require, exports, module) {

    var $ = require('jquery'),
        ko = require('knockout');
    ko.mapping = require('knockout.mapping');

    var grid_i18n = {
        "en": {
            "pagination": {
                "record_prefix": "Record",
                "record_unit": "",
                "recordcount_prefix": "",
                "recordcount_unit": "Total",
                "pageindex_prefix": "Page Index",
                "pageindex_unit": "",
                "pagecount_prefix": "",
                "pagecount_unit": "Pages",
                "pagesize_prefix": "Page Size",
                "pagesize_unit": ""
            },
            "operation": {
                "show_more": "Show More",
                "update": "Update",
                "delete": "Delete",
                "save": "Save",
                "cancel": "Cancel"
            },
            "status": {
                "load": "Loading...",
                "no_data": "No Data"
            }
        },
        "zh": {
            "pagination": {
                "record_prefix": "第",
                "record_unit": "条",
                "recordcount_prefix": "共",
                "recordcount_unit": "条",
                "pageindex_prefix": "第",
                "pageindex_unit": "页",
                "pagecount_prefix": "共",
                "pagecount_unit": "页",
                "pagesize_prefix": "每页",
                "pagesize_unit": "条"
            },
            "operation": {
                "show_more": "显示更多",
                "update": "修改",
                "delete": "删除",
                "save": "保存",
                "cancel": "取消"
            },
            "status": {
                "load": "数据加载中...",
                "no_data": "暂无数据"
            }
        }
    };

    var grid_lng = grid_i18n.en;

    function GridViewModel(options) {
        var that = this;

        var defaultOptions = {
            caption: '',
            foot: '',
            data: null,
            columns: [],
            orderBy: '',
            filters: {},
            pageSize: 10,
            pageNumbersLength: 5,
            autoRetrieve: true,
            ajaxRetrieveUrl: '',
            ajaxUpdateUrl: '',
            ajaxDeleteUrl: '',
            beforeMapping: function(data) { return data;},
            afterMapping: function() { },
            afterModelsRefresh: function() { },
            getPostData: function(data) { return data;},
            afterUpdate: function(data) { alert('Update Successful!');},
            beforeDelete: function(data) { return confirm('Are you sure?');},
            afterDelete: function(data) { alert('Remove Successful!');},
            showMoreText: grid_lng.operation.show_more,
            showMore: true,
            pagination: {
                "record_prefix": grid_lng.pagination.record_prefix,
                "record_unit": grid_lng.pagination.record_unit,
                "recordcount_prefix": grid_lng.pagination.recordcount_prefix,
                "recordcount_unit": grid_lng.pagination.recordcount_unit,
                "pageindex_prefix": grid_lng.pagination.pageindex_prefix,
                "pageindex_unit": grid_lng.pagination.pageindex_unit,
                "pagecount_prefix": grid_lng.pagination.pagecount_prefix,
                "pagecount_unit": grid_lng.pagination.pagecount_unit,
                "pagesize_prefix": grid_lng.pagination.pagesize_prefix,
                "pagesize_unit": grid_lng.pagination.pagesize_unit
            },
            operation: {
                'update': grid_lng.operation.update,
                'delete': grid_lng.operation['delete'],
                'save': grid_lng.operation.save,
                'cancel': grid_lng.operation.cancel
            }
        }

        $.extend(this, defaultOptions, options);

        this.dataSet = ko.observableArray([]);
        this.models = ko.observableArray([]);

        var masterFilterKeys = [];
        this.filters = function() {
            var filters = that.filters;
            for(var key in filters) {
                if(ko.isObservable(filters[key])) {
                    filters[key].subscribe(function() { loadData(); });
                    masterFilterKeys.push(key);
                }
            }
            var filterEnum = {};
            $.each(that.columns, function(index, item) {
                if(item.filterType) {
                    filters[item.dataField] = ko.observable('');
                    filters[item.dataField].subscribe(function() { loadData(); });

                    item.filterType === 'select' && (filterEnum[item.dataField] = ko.observableArray([]));
                }
            });
            that.filterEnum = filterEnum;
            return filters;
        }();

        this.orderBy = ko.observable(this.orderBy);

        this.recordCount = ko.observable(0);
        this.pageIndex = ko.observable(1);
        this.pageSize = ko.observable(this.pageSize);
        this.pageCount = ko.computed({
            read: function() {
                return Math.ceil(this.recordCount() / this.pageSize());
            },
            owner: this
        });
        this.pageNumbersLength = ko.observable(this.pageNumbersLength);
        this.pageNumbers = ko.computed({
            read: function() {
                var numbers = [],
                    startIndex = Math.floor((this.pageIndex() - 1) / this.pageNumbersLength()) * this.pageNumbersLength(),
                    endIndex = Math.min(this.pageCount(), startIndex + this.pageNumbersLength());
                for (var i = startIndex + 1; i <= endIndex; i++) {
                    numbers.push(i);
                }
                return numbers;
            },
            owner: this
        });

        this._chkAll = ko.computed({
            read: function() {
                return null == ko.utils.arrayFirst(this.models(), function(item) {
                    return !ko.unwrap(item._chkItem);
                });
            },
            write: function(checked) {
                ko.utils.arrayForEach(this.models(), function (item) {
                    item._chkItem(checked);
                });
            },
            owner: this
        });

        function _mappingData(data) {
            data = that.beforeMapping(data);
            $.each(data, function(index, item) {
                item._chkItem === undefined && (item._chkItem = false);
                item._editing === undefined && (item._editing = false);
            });
            that.dataSet(ko.unwrap(ko.mapping.fromJS(data)));

            that.afterMapping();
        }

        var isFirstLoadData = true;
        function loadData() {
            if(isFirstLoadData || masterFilterKeys.length > 0) {
                var tempFilters = {};
                masterFilterKeys.forEach(function(key) {
                    tempFilters[key] = that.filters[key];
                });
                for(var propName in that.filterEnum) {
                    var arr_enum = ko.utils.arrayGetDistinctValues(that.dataSet.filterByPropertys(tempFilters).mapByProperty(propName)).sort(function(a, b) {
                        return (a + '').localeCompare(b + '');
                    });
                    that.filterEnum[propName](arr_enum);
                }
                isFirstLoadData = false;
            }

            var items = that.dataSet.filterByPropertys(that.filters);
            that.recordCount(ko.unwrap(items).length);

            items = items.sortByPropertys(that.orderBy).slice((that.pageIndex() - 1) * that.pageSize(), that.pageIndex() * that.pageSize());
            that.models(ko.unwrap(items));

            that.afterModelsRefresh();
        }

        this.orderBy.subscribe(function() {
            loadData();
        });
        this.pageIndex.subscribe(function() {
            loadData();
        });
        this.pageSize.subscribe(function() {
            loadData();
        });
        this.dataSet.subscribe(function() {
            loadData();
        });


        this.sort = function () {
            var $element = $(event.target || event.srcElement),
                key = this.dataField,
                orderBy = ko.unwrap(that.orderBy).split(','),
                sortItem,
                sortKey,
                sortDirection;

            for(var i = 0; i < orderBy.length; i++) {
                sortItem = orderBy[i].split(' ');
                sortKey = sortItem.shift();
                sortDirection = sortItem.pop();
                if(sortKey === '') {
                    orderBy.splice(i, 1);
                    i--;
                }
                else if(sortKey == key) {
                    $element.removeClass(sortDirection);
                    orderBy.splice(i, 1);
                    break;
                }
            }
            sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
            if(!event.ctrlKey) {
                $element.parents('tr').find($element[0].tagName).removeClass('asc').removeClass('desc');
                orderBy = [];
            }
            $element.addClass(sortDirection);
            orderBy.push(key + ' ' + sortDirection);
            that.orderBy(orderBy.join(','));

            that.pageIndex(1);
        };

        this.turnPage = function (pageIndex) {
            pageIndex = isNaN(pageIndex) || pageIndex < 1 ? 1 : Math.min(that.pageCount(), pageIndex);
            that.pageIndex(pageIndex);
        };

        this.toggleItemEditing = function() {
            this._editing(!this._editing());
        };
        this.saveItem = function() {
            var item = this;
            $(event.target || event.srcElement).parents('tr').find('input.editing').each(function() {
                var bind = $(this).attr('data-bind').replace(/value:(.{1,})\(\).*/,'$1').split('.').pop();
                item[bind](isNaN(this.value) ? this.value : parseFloat(this.value));
            });
            item._editing(false);
            that.update(item);
        };
        this.removeItem = function() {
            var item = this;
            if(that.beforeDelete()) {
                that.dataSet.remove(item);
                that['delete'](item);
            }
        };

        this.isDataLoaded = ko.observable(!options.autoRetrieve);
        this.retrieve = function () {
            this.pageIndex(1);
            if (this.data){
                if(this.autoRetrieve) {
                    that.isDataLoaded(true);
                    _mappingData(ko.unwrap(this.data));
                }

                ko.isObservable(this.data) && this.data.subscribe(function(newValue) {
                    _mappingData(newValue);
                });
            }
            else if(this.ajaxRetrieveUrl) {
                if(this.autoRetrieve) {
                    that.isDataLoaded(false);
                    $.getJSON(ko.unwrap(this.ajaxRetrieveUrl), function (result) {
                        that.isDataLoaded(true);
                        _mappingData(result);
                    });
                }

                ko.isObservable(this.ajaxRetrieveUrl) && this.ajaxRetrieveUrl.subscribe(function(newValue) {
                    that.isDataLoaded(false);
                    $.getJSON(newValue, function (result) {
                        that.isDataLoaded(true);
                        _mappingData(result);
                    });
                });
            }
        };

        this.update = function(data) {
            data = data || this.dataSet();
            var postData = this.getPostData(ko.mapping.toJS(data));
            $.ajax({
                'type': 'POST',
                'contentType': 'application/json; charset=utf-8',
                'url': options.ajaxUpdateUrl,
                'data': JSON.stringify(postData),
                success: function(result) {
                    if(result.status == "success") {
                        that.afterUpdate();
                    }
                }
            });
        };

        this['delete'] = function(data) {
            var postData = this.getPostData(ko.mapping.toJS(data));
            $.ajax({
                'type': 'POST',
                'contentType': 'application/json; charset=utf-8',
                'url': options.ajaxDeleteUrl,
                'data': JSON.stringify(postData),
                success: function(result) {
                    that.afterDelete();
                }
            });
        };

        this.retrieve();

        return this;
    }

    ko.observable.fn.mapByProperty = function(propName) {
        var arr = [], propNames = propName.split('.');
        ko.utils.arrayForEach(ko.unwrap(this), function(item) {
            var value = ko.unwrap(item[propNames[0]]);
            if(Array.isArray(value)) {
                arr = arr.concat(ko.observableArray(value).mapByProperty(propNames.slice(1).join('.')));
            }
            else {
                arr.push(value);
            }
        });
        return arr;
    }

    ko.observableArray.fn.filterByPropertys = function(propertys) {
        var items = this(),
            propertys = ko.unwrap(propertys),
            filterPropNames = [];
        if(items.length > 0) {
            for(var propName in propertys) {
                // [undefined, null, ''].indexOf(ko.unwrap(propertys[propName])) == -1 && filterPropNames.push(propName);
                [undefined, ''].indexOf(ko.unwrap(propertys[propName])) == -1 && filterPropNames.push(propName);
            }
        }
        if(filterPropNames.length > 0) {
            var flag, propName, propNames, matchValue, matchOperator, itemValue, itemArray, childFlag;
            items = ko.utils.arrayFilter(items, function (item) {
                flag = true;
                for(var i = 0; i < filterPropNames.length; i++) {
                    propName = filterPropNames[i];
                    matchValue = ko.unwrap(propertys[propName]);
                    matchOperator = ko.unwrap(propertys[propName].filterOperator);
                    propNames = propName.split('.');
                    if(propNames.length == 1) {
                        itemValue = ko.unwrap(item[propName]);
                        flag = flag && customCompare(itemValue, matchValue, matchOperator);
                    }
                    else if(propNames.length == 2){
                        childFlag = false;
                        itemArray = ko.unwrap(item[propNames[0]]);
                        for(var j = 0; j < itemArray.length; j++) {
                            itemValue = ko.unwrap(itemArray[j][propNames[1]]);
                            childFlag = childFlag || customCompare(itemValue, matchValue, matchOperator);
                        }
                        flag = flag && childFlag;
                    }
                }
                return flag;
            });
        }
        return ko.observableArray(items);
    }
    function customCompare(itemValue, matchValue, matchOperator) {
        var flag = false;
        if(matchOperator == undefined) {
            matchOperator = Array.isArray(itemValue) || typeof itemValue === 'string' ? 'Contains' : 'Equals';
        }
        if(matchOperator == 'Contains') {
            flag = itemValue.indexOf(matchValue) > -1;
        }
        else if(matchOperator == 'NotContain') {
            flag = itemValue.indexOf(matchValue) == -1;
        }
        else if(matchOperator == 'In') {
            flag = matchValue.indexOf(itemValue) > -1;
        }
        else if(matchOperator == 'NotIn') {
            flag = matchValue.indexOf(itemValue) == -1;
        }
        else if(matchOperator == 'Equals') {
            flag = itemValue == matchValue;
        }
        else if(matchOperator == 'NotEqual') {
            flag = itemValue != matchValue;
        }
        else if(matchOperator == 'Greater') {
            flag = itemValue > matchValue;
        }
        else if(matchOperator == 'Less') {
            flag = itemValue < matchValue;
        }
        else if(matchOperator == 'GreaterOrEqual') {
            flag = itemValue >= matchValue;
        }
        else if(matchOperator == 'LessOrEqual') {
            flag = itemValue <= matchValue;
        }
        return flag;
    }

    ko.observableArray.fn.sortByPropertys = function(propertys) {
        var items = this(),
            propertys = ko.unwrap(propertys),
            arrProps = [],
            sortItem,
            sortKey,
            sortDirection;
        if(typeof propertys === 'string') {
            $.each(propertys.split(','), function() {
                sortItem = this.split(' ');
                sortKey = sortItem.shift();
                sortDirection = sortItem.pop();
                sortDirection !== 'none' && arrProps.push({key: sortKey, direction: sortDirection});
            });
        }
        else if(typeof propertys === 'object') {
            for(sortKey in propertys) {
                sortDirection = ko.unwrap(propertys[sortKey]);
                sortDirection !== undefined && arrProps.push({key: sortKey, direction: sortDirection});
            }
        }
        if(arrProps.length) {
            var flag, l, f;
            items.sort(function(left, right) {
                flag = 0;
                $.each(arrProps, function() {
                    l = isNaN(ko.unwrap(left[this.key])) ? ko.unwrap(left[this.key]) : parseFloat(ko.unwrap(left[this.key]));
                    r = isNaN(ko.unwrap(right[this.key])) ? ko.unwrap(right[this.key]) : parseFloat(ko.unwrap(right[this.key]));
                    flag = flag || compare(l, r, this.direction);
                });
                return flag;
            });
        }
        return ko.observableArray(items);
    }
    function compare(x, y, flag) {
        flag = flag === -1 || flag === false || flag === 'desc' ? -1 : 1;
        return x > y ? flag : x < y ? -flag : 0;
    }

    ko.bindingHandlers.grid = {
        init: function(element, valueAccessor, allBindingsAccessor, viewModel) {
            var dataBind = (ko.unwrap(valueAccessor()) && 'data-bind="with: ' + ko.unwrap(valueAccessor()) + '"') || '';
            $(element).html([
                '<div class="grid" ' + dataBind + '>',
                    '<table class="table">',
                        '<caption data-bind="dHtml: caption"></caption>',
                        '<thead>',
                            '<tr data-bind="foreach: columns">',
                                '<th data-bind="columnHead: $data"></th>',
                            '</tr>',
                        '</thead>',
                        '<tbody>',
                            '<!-- ko if: !isDataLoaded() -->',
                                '<tr><td data-bind="attr: { colSpan: columns.length }"><div class="loading"></div></td></tr>',
                            '<!-- /ko -->',
                            '<!-- ko if: isDataLoaded() -->',
                                '<!-- ko if: models().length == 0 -->',
                                    '<tr><td data-bind="attr: { colSpan: columns.length }">' + grid_lng.status.no_data + '</td></tr>',
                                '<!-- /ko -->',
                                '<!-- ko foreach: models -->',
                                    '<tr data-bind="foreach: $parent.columns, click: $parent.trClickEvent">',
                                        '<td data-bind="columnBody: $data, cellData: $parent[$data.dataField]"></td>',
                                    '</tr>',
                                '<!-- /ko -->',
                            '<!-- /ko -->',
                        '</tbody>',
                        '<!-- ko if: isDataLoaded() && models().length > 0 -->',
                        '<tfoot>',
                            '<tr>',
                                '<td data-bind="attr: { colSpan: columns.length }" class="clearfix">',
                                    '<!-- ko if: pageCount() > 1 -->',
                                        '<ul class="pagination">',
                                            '<li class="pagination_item pagination_item-prev">',
                                                // '<a href="#" data-bind="click: function() { turnPage( pageNumbers().slice(0, 1)[0] - 1 ) }" >&lt;</a>',
                                                '<!-- ko if: pageNumbers()[0] > 1 -->',
                                                    '<div class="prev prev-horiz" data-bind="click: function() { turnPage( pageNumbers().slice(0, 1)[0] - 1 ) }"></div>...&nbsp;',
                                                '<!-- /ko -->',
                                                '<!-- ko if: pageNumbers()[0] == 1 -->',
                                                    '<div class="prev prev-horiz prev-horiz-disabled"></div>',
                                                '<!-- /ko -->',
                                            '</li>',
                                            '<!-- ko foreach: pageNumbers -->',
                                                '<li class="pagination_item" data-bind="css: { active: $data == $parent.pageIndex() }">',
                                                    '<a href="#" data-bind="text: $data, click: $parent.turnPage" ></a>',
                                                '</li>',
                                            '<!-- /ko -->',
                                            '<!-- ko if: pageNumbers().slice(-1)[0] < pageCount() -->',
                                                '<li class="pagination_item pagination_item-next">&nbsp;...',
                                                    '<div class="next next-horiz" data-bind="click: function() { turnPage( pageNumbers().slice(-1)[0] + 1 ) }"></div>',
                                                    // '<a href="#" data-bind="click: function() { turnPage( pageNumbers().slice(-1)[0] + 1 ) }" >&gt;</a>',
                                                '</li>',
                                            '<!-- /ko -->',
                                            '<li class="pagination_item pagination_item-pageInfo">',
                                                '<input class="textbox textbox-smaller" data-bind="value: pageIndex(), event: { blur: function() { turnPage((event.target || event.srcElement).value) } }" />',
                                                '<span data-bind="text: \'/\' + pageCount() + \'&nbsp\' + pagination.pagecount_unit + \'&nbsp;\'"></span>',
                                                '<span data-bind="text: pagination.recordcount_prefix + \'&nbsp;\' + recordCount() + \'&nbsp;\' + pagination.recordcount_unit"></span>',
                                            '</li>',
                                        '</ul>',
                                        '<!-- ko if: showMore -->',
                                        '<div class="show-more" data-bind="click: function() { pageSize(pageSize() * 2); pageIndex(1); }">',
                                            '<span data-bind="text: showMoreText">Show More</span>',
                                        '</div>',
                                        '<!-- /ko -->',
                                    '<!-- /ko -->',
                                    '<div class="list-operation" data-bind="dHtml: foot"></div>',
                                '</td>',
                            '</tr>',
                        '</tfoot>',
                        '<!-- /ko -->',
                    '</table>',
                '</div>'
            ].join(''));
        }
    };

    ko.bindingHandlers.dHtml = {
        init: function(element, valueAccessor, allBindingsAccessor, viewModel) {
            var caption = ko.unwrap(valueAccessor());
            if(caption) {
                $(element).html(caption);
            }
            else {
                $(element).remove();
            }
        }
    };

    ko.bindingHandlers.columnHead = {
        init: function(element, valueAccessor, allBindingsAccessor, viewModel) {
            var column = ko.unwrap(valueAccessor());
            var additional_bind = column.head_bind ? (', ' + column.head_bind) : '';
            var $innerElement, dataBind;
            if(column.filterType === 'select') {
                dataBind = 'options: $parent.filterEnum["' + column.dataField + '"], selectedOptions: $parent.filters["' + column.dataField + '"], optionsCaption: "' + column.head + '"' + additional_bind;
                $innerElement = $('<label class="select"></label>').html($('<select/>').attr('data-bind', dataBind));

                $(element).addClass('cell-select');
            }
            else if(column.filterType === 'textbox') {
                dataBind = 'valueUpdate: "afterkeydown", value: $parent.filters["' + column.dataField + '"]' + additional_bind;
                $innerElement = $('<input type="text" class="textbox" />').attr('data-bind', dataBind).attr('placeholder', column.head);

                $(element).addClass('cell-textbox');
            }
            else if(column.type === 'checkbox' && column.head === undefined) {
                dataBind = 'checked: $parent._chkAll' + additional_bind;
                $innerElement = $('<label class="checkbox"/>').append($('<input type="checkbox" />').attr('data-bind', dataBind)).append('<span></span>');

                $(element).addClass('cell-checkbox');
            }
            else if(column.sort === true) {
                dataBind = 'click: $parent.sort' + additional_bind;
                $innerElement = [$('<a href="javascript:;" />').attr('data-bind', dataBind).html(column.head), $('<i>&nbsp;</i>')];
            }
            if(!$innerElement && additional_bind) {
                dataBind = additional_bind.slice(2);
                $innerElement = $('<span/>').attr('data-bind', dataBind).html(column.head);
            }
            $(element).addClass(column['class']).attr('width', column.width).html($innerElement || column.head);
        }
    };

    ko.bindingHandlers.columnBody = {
        init: function(element, valueAccessor, allBindingsAccessor, viewModel) {
            var column = ko.unwrap(valueAccessor()),
                value = ko.unwrap(allBindingsAccessor().cellData),
                $innerElement,
                dataBind;
            var additional_bind = column.body_bind ? (', ' + column.body_bind) : '';
            if(column.type === 'checkbox') {
                dataBind = 'checked: ' + (column.dataField || '$parent._chkItem') + additional_bind;
                $innerElement = $('<label class="checkbox" />').append($('<input type="checkbox" />').attr('data-bind', dataBind)).append('<span></span>');
            }
            else if(column.type === 'textbox') {
                dataBind = 'value: $parent.' + column.dataField + additional_bind;
                $innerElement = $('<input type="text" class="textbox textbox-smaller"/>').attr('data-bind', dataBind);
            }
            else if(column.type === 'button') {
                if(column.template) {
                    var visibleStatus = ['$parent._editing', '!$parent._editing()'];
                    var clickEvents = ['$parentContext.$parent.toggleItemEditing.bind($parent)', '$parentContext.$parent.saveItem.bind($parent)', '$parentContext.$parent.removeItem.bind($parent)'];
                    var temp = column.template.match(/\{\w+\}|[&\w;|]+/g);

                    var $update = $('<a href="javascript:;" />').attr('data-bind', 'click:' + clickEvents[0] + ', html: $parentContext.$parent.operation.update');
                    var $delete = $('<a href="javascript:;" />').attr('data-bind', 'click:' + clickEvents[2] + ', html: $parentContext.$parent.operation.delete');
                    temp.indexOf('{update}') > -1 && temp.splice(temp.indexOf('{update}'), 1, $update);
                    temp.indexOf('{delete}') > -1 && temp.splice(temp.indexOf('{delete}'), 1, $delete);

                    var $save = $('<a href="javascript:;" />').attr('data-bind', 'click:' + clickEvents[1] + ', html: $parentContext.$parent.operation.save');
                    var $span = $('<a href="javascript:;" />').html('&nbsp;|&nbsp;');
                    var $canel = $('<a href="javascript:;" />').attr('data-bind', 'click:' + clickEvents[0] + ', html: $parentContext.$parent.operation.cancel');

                    $innerElement = [$('<div/>').attr('data-bind', 'visible:' + visibleStatus[1]).html(temp), $('<div/>').attr('data-bind', 'visible:' + visibleStatus[0]).html([$save, $span, $canel])];
                }
            }
            else if(column.type) {
                dataBind = column.type + ': $parent.' + column.dataField + additional_bind;
                $innerElement = $('<div/>').attr('data-bind', dataBind);
            }
            else if(column.dataField.split('.').length == 2) {
                dataBind = 'foreach: $parent.' + column.dataField.split('.').shift() + additional_bind;
                $innerElement = $('<ul class="td_mutiple"/>').attr('data-bind', dataBind).append($('<li/>').attr('data-bind', 'text: ' + column.dataField.split('.').pop()));
            }
            else if(column.editable === true) {
                dataBind = 'text: $parent.' + column.dataField + ', visible: !$parent._editing()' + additional_bind;
                $innerElement = $('<span />').attr('data-bind', dataBind);
                dataBind = 'value: $parent.' + column.dataField + '(), visible: $parent._editing' + additional_bind;
                $.merge($innerElement, $('<input type="text" class="editing" />').attr('data-bind', dataBind));
            }
            if(!$innerElement && additional_bind) {
                dataBind = additional_bind.slice(2);
                $innerElement = $('<span/>').attr('data-bind', dataBind).html(value || column.dataField);
            }
            value = $innerElement || value;
            value = value === undefined ? column.dataField : value;
            $(element).addClass(column['class']).attr('width', column.width).html(value);
        },
        update: function(element, valueAccessor, allBindingsAccessor, viewModel) {
            var column = ko.unwrap(valueAccessor());
            if(column.dataField === '_index') {
                var item = ko.contextFor(element).$parentContext;
                var index = item.$parent.pageSize() * (item.$parent.pageIndex() - 1) + item.$index() + 1;
                $(element).html(index);
                index % 2 == 0 ? $(element).parents('tr').addClass('odd') : $(element).parents('tr').removeClass('odd');
            }
        }
    };

    ko.extenders.required = function(target, overrideMessage) {
        //add some sub-observables to our observable
        target.hasError = ko.observable();
        target.validationMessage = ko.observable();

        //define a function to do validation
        function validate(newValue) {
           target.hasError(newValue ? false : true);
           target.validationMessage(newValue ? "" : overrideMessage || "This field is required");
        }

        //initial validation
        validate(target());

        //validate whenever the value changes
        target.subscribe(validate);

        //return the original observable
        return target;
    };

    ko.extenders.numeric = function(target, precision) {
        //create a writeable computed observable to intercept writes to our observable
        var result = ko.computed({
            read: target,  //always return the original observables value
            write: function(newValue) {
                var current = target(),
                    roundingMultiplier = Math.pow(10, precision),
                    newValueAsNum = isNaN(newValue) ? 0 : parseFloat(+newValue),
                    valueToWrite = Math.round(newValueAsNum * roundingMultiplier) / roundingMultiplier;

                //only write if it changed
                if (valueToWrite !== current) {
                    target(valueToWrite);
                } else {
                    //if the rounded value is the same, but a different value was written, force a notification for the current field
                    if (newValue !== current) {
                        target.notifySubscribers(valueToWrite);
                    }
                }
            }
        });

        //initialize with current value to make sure it is rounded appropriately
        result(target());

        //return the new computed observable
        return result;
    };

    ko.extenders.filterOperator = function(target, filterOperator) {
        target.filterOperator = ko.observable(filterOperator);
        target.filterOperator.subscribe(function() {
            target.notifySubscribers(target());
        });

        return target;
    };

    module.exports = GridViewModel;
});
