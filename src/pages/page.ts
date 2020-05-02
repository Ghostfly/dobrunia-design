import { html, TemplateResult } from 'lit-html';
import { unsafeHTML } from 'lit-html/directives/unsafe-html';
import { property, customElement } from 'lit-element';

import Page from '../core/strategies/Page';
import Constants from '../constants';

import { Utils, onImageContainerClicked } from '../core/ui/ui';
import { fadeWith } from '../core/animations';
import { ProjectMinimal } from './project';
import { wrap } from '../core/errors/errors';

@customElement('ui-page')
export class PageController extends Page {
    public static readonly hasRouting: boolean = true;

    @property({type: Object, reflect: false})
    public article: ProjectMinimal;
    @property({type: String, reflect: false})
    public featured: string;
    private _toLoad: string;

    public constructor(toLoad: string){
        super();

        this._toLoad = toLoad;
    }
    
    private async _load(uri: string){
        const pageQuery = `
        {
            pageBy(uri: "${uri}") {
                title
                featuredImage {
                    sourceUrl
                }
                content(format: RENDERED)
                }
        }              
        `;

        const first = await fetch(Constants.graphql, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query: pageQuery
            })
        }).then(res => res.json()).then(res => res.data.pageBy).catch(_ => this.dispatchEvent(wrap(_))) as ProjectMinimal;

        this.loaded = true;

        const post = first;
        document.title = post.title + ' | ' + Constants.title;
        this.article = post;
        const hasSource = post?.featuredImage?.sourceUrl;
        this.featured = hasSource ? post.featuredImage.sourceUrl : '/assets/logo.png';

        if(Utils.animationsReduced()){
            return;
        }
        const fade = fadeWith(300, true);
        this._page.animate(fade.effect, fade.options);
    }

    public async firstUpdated(){
        await this._load(this._toLoad);
    }

    public render(): void | TemplateResult {
        return html`
        <div id="page" class="page" role="main">
            ${!this.loaded ? html`
            <div class="loading">
                <paper-spinner active></paper-spinner>
            </div>` : html``}
            ${this.article ? html`
            <div class="cols">
                <div class="content">
                    ${unsafeHTML(this.article.content)}
                </div>
                ${this.featured ? html`
                <div class="image-container" @click=${onImageContainerClicked}>
                    <iron-image sizing="contain" src="${this.featured}"></iron-image>
                </div>
                ` : html``}
            </div>
            ` : html``}
        </div>
        `;
    }

    private get _page(){
        return this.querySelector('#page');
    }
}
