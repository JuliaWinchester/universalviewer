import {BaseEvents} from "../uv-shared-module/BaseEvents";
import {CenterPanel} from "../uv-shared-module/CenterPanel";

export class AVCenterPanel extends CenterPanel {

    $avcomponent: JQuery;
    avcomponent: IIIFComponents.AVComponent;
    title: string | null;
    private _canvasReady: boolean = false;
    private _resourceOpened: boolean = false;
    private _isThumbsViewOpen: boolean = false;

    constructor($element: JQuery) {
        super($element);
    }

    create(): void {

        this.setConfig('avCenterPanel');

        super.create();

        const that = this;

        $.subscribe(BaseEvents.OPEN_EXTERNAL_RESOURCE, (e: any, resources: Manifesto.IExternalResource[]) => {
            if (!this._resourceOpened) {
                that.openMedia(resources);
                this._resourceOpened = true;
            }
        });

        $.subscribe(BaseEvents.CANVAS_INDEX_CHANGED, (e: any, canvasIndex: number) => {
            this._whenCanvasReady(() => {
                this._viewCanvas(canvasIndex);
            });            
        });

        $.subscribe(BaseEvents.RANGE_CHANGED, (e: any, range: Manifesto.IRange | null) => {

            if (!this._observeRangeChanges()) {
                return;
            }

            this._whenCanvasReady(() => {
                that._viewRange(range);
                that._setTitle();
            });

        });

        $.subscribe(BaseEvents.METRIC_CHANGED, () => {
            this._whenCanvasReady(() => {
                this.avcomponent.set({
                    limitToRange: this._limitToRange(),
                    constrainNavigationToRange: this._limitToRange()
                });
            });
        });

        $.subscribe(BaseEvents.CREATED, () => {
            this._setTitle();
        });

        $.subscribe(BaseEvents.OPEN_THUMBS_VIEW, () => {

            this._isThumbsViewOpen = true;

            this._whenCanvasReady(() => {

                this.avcomponent.set({
                    virtualCanvasEnabled: false
                });

                const canvas: Manifesto.ICanvas | null = this.extension.helper.getCurrentCanvas();
        
                if (canvas) {
                    this._viewCanvas(this.extension.helper.canvasIndex)
                }

            });
        });

        $.subscribe(BaseEvents.OPEN_TREE_VIEW, () => {

            this._isThumbsViewOpen = false;

            this._whenCanvasReady(() => {
                this.avcomponent.set({
                    virtualCanvasEnabled: true
                });
            });
        });

        this.$avcomponent = $('<div class="iiif-av-component"></div>');
        this.$content.append(this.$avcomponent);

        this.avcomponent = new IIIFComponents.AVComponent({
            target: this.$avcomponent[0]
        });

        this.avcomponent.on('canvasready', () => {
            console.log('canvasready');
            this._canvasReady = true;
        }, false);

        this.avcomponent.on('rangechanged', (rangeId: string | null) => {        
            
            if (rangeId) {

                this._setTitle();

                const range: Manifesto.IRange | null = this.extension.helper.getRangeById(rangeId);

                if (range) {
                    const currentRange: Manifesto.IRange | null = this.extension.helper.getCurrentRange();

                    if (range !== currentRange) {
                        $.publish(BaseEvents.RANGE_CHANGED, [range]);
                    }
                    
                } else {
                    $.publish(BaseEvents.RANGE_CHANGED, [null]);
                }

            } else {
                $.publish(BaseEvents.RANGE_CHANGED, [null]);
            } 
            
        }, false);

    }

    private _observeRangeChanges(): boolean {
        if (!this._isThumbsViewOpen) {
            return true;
        }

        return false;
    }

    private _setTitle(): void {

        let title: string = '';
        let value: string | null;
        let label: Manifesto.TranslationCollection;

        // get the current range or canvas title
        const currentRange: Manifesto.IRange | null = this.extension.helper.getCurrentRange();

        if (currentRange) {
            label = currentRange.getLabel();
        } else {
            label = this.extension.helper.getCurrentCanvas().getLabel();
        }

        value = Manifesto.TranslationCollection.getValue(label);

        if (value) {
            title = value;
        }

        // get the parent range or manifest's title
        if (currentRange) {
            if (currentRange.parentRange) {
                label = currentRange.parentRange.getLabel();
                value = Manifesto.TranslationCollection.getValue(label);
            }
        } else {
            value = this.extension.helper.getLabel();
        }

        if (value) {
            title += this.content.delimiter + value;
        }

        this.title = title;

        this.resize();
    }

    openMedia(resources: Manifesto.IExternalResource[]) {

        this.extension.getExternalResources(resources).then(() => {

            this.avcomponent.set({
                helper: this.extension.helper,
                autoPlay: this.config.options.autoPlay,
                autoSelectRange: true,
                defaultAspectRatio: 0.56,
                limitToRange: this._limitToRange(),
                constrainNavigationToRange: this._limitToRange(),
                doubleClickMS: 350,
                content: this.content
            });

            this.resize();
        });
    }

    private _limitToRange(): boolean {
        return !this.extension.isDesktopMetric();
    }

    private _whenCanvasReady(cb: () => void): void {
        Utils.Async.waitFor(() => {
            return this._canvasReady;
        }, cb);
    }

    private _viewRange(range: Manifesto.IRange | null): void {

        this._whenCanvasReady(() => {
            if (range) {
                //setTimeout(() => {
                    //console.log('view ' + range.id);
                    this.avcomponent.playRange(range.id);
                //}, 500); // don't know why this is needed :-(
            }
            
            this.resize();
        });
    }

    private _viewCanvas(canvasIndex: number): void {

        Utils.Async.waitFor(() => {
            return this._canvasReady;
        }, () => {

            const canvas: Manifesto.ICanvas | null = this.extension.helper.getCanvasByIndex(canvasIndex);
        
            this.avcomponent.showCanvas(canvas.id);
        });
    }

    resize() {

        super.resize();

        if (this.title) {
            this.$title.ellipsisFill(this.title);
        }

        this.$avcomponent.height(this.$content.height());

        this.avcomponent.resize(); 
              
    }
}